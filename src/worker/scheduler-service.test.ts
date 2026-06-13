import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "./env";
import { scheduleDueTasks } from "./scheduler-service";

function createEnv(updateChanges = 1): AppEnv & { statements: Array<{ sql: string; binds: unknown[] }>; send: ReturnType<typeof vi.fn> } {
  const statements: Array<{ sql: string; binds: unknown[] }> = [];
  const send = vi.fn();

  const env = {
    statements,
    send,
    DB: {
      prepare(sql: string) {
        return {
          bind(...binds: unknown[]) {
            statements.push({ sql, binds });
            if (sql.includes("SELECT")) {
              return {
                all: async () => ({
                  results: [
                    {
                      id: 7,
                      interval_minutes: 1,
                      next_run_at: "2026-06-10T00:00:00.000Z"
                    }
                  ]
                })
              };
            }

            return {
              run: async () => ({
                meta: { changes: updateChanges }
              })
            };
          }
        };
      }
    } as unknown as D1Database,
    TASK_QUEUE: {
      send
    } as unknown as Queue,
    ASSETS: {} as Fetcher
  };

  return env as AppEnv & { statements: Array<{ sql: string; binds: unknown[] }>; send: ReturnType<typeof vi.fn> };
}

describe("scheduler-service", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reserves the next scheduled slot before enqueuing a cron run", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T00:00:30.000Z"));
    const env = createEnv();

    await expect(scheduleDueTasks(env)).resolves.toBe(1);

    const update = env.statements.find((statement) => statement.sql.includes("UPDATE tasks"));
    expect(update?.binds).toEqual([
      "2026-06-10T00:01:00.000Z",
      "2026-06-10T00:00:30.000Z",
      7,
      "2026-06-10T00:00:00.000Z"
    ]);
    expect(env.send).toHaveBeenCalledWith({ taskId: 7, triggerType: "cron" });
  });

  it("does not enqueue when another scheduler already reserved the row", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T00:00:30.000Z"));
    const env = createEnv(0);

    await expect(scheduleDueTasks(env)).resolves.toBe(0);

    expect(env.send).not.toHaveBeenCalled();
  });
});
