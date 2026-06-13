import { describe, expect, it } from "vitest";
import { calculateNextRunAt, calculateNextScheduledRunAt, normalizePage } from "./task-service";

describe("task-service", () => {
  it("calculates next_run_at from minute intervals", () => {
    const from = new Date("2026-06-10T00:00:00.000Z");

    expect(calculateNextRunAt(10, from)).toBe("2026-06-10T00:10:00.000Z");
  });

  it("advances scheduled runs from the scheduled time instead of finish time", () => {
    expect(calculateNextScheduledRunAt(1, "2026-06-10T00:00:00.000Z", new Date("2026-06-10T00:00:30.000Z"))).toBe(
      "2026-06-10T00:01:00.000Z"
    );
  });

  it("skips missed scheduled intervals to the next future slot", () => {
    expect(calculateNextScheduledRunAt(1, "2026-06-10T00:00:00.000Z", new Date("2026-06-10T00:02:10.000Z"))).toBe(
      "2026-06-10T00:03:00.000Z"
    );
  });

  it("normalizes pagination from URL search params", () => {
    const url = new URL("https://example.com/api/logs?page=2&page_size=500");

    expect(normalizePage(url)).toEqual({ page: 2, pageSize: 100, offset: 100 });
  });
});
