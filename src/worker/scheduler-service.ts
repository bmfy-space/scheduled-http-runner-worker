import { LIMITS } from "../shared/constants";
import type { AppEnv, QueueMessageBody } from "./env";
import { calculateNextScheduledRunAt } from "./task-service";

type DueTaskRow = {
  id: number;
  interval_minutes: number;
  next_run_at: string;
};

export async function scheduleDueTasks(env: AppEnv): Promise<number> {
  const now = new Date();
  const nowIso = now.toISOString();
  const result = await env.DB.prepare(`
    SELECT id, interval_minutes, next_run_at
    FROM tasks
    WHERE enabled = 1
      AND deleted_at IS NULL
      AND next_run_at IS NOT NULL
      AND next_run_at <= ?
    ORDER BY next_run_at ASC
    LIMIT ?
  `).bind(nowIso, LIMITS.dueTaskBatchSize).all<DueTaskRow>();

  let queued = 0;
  for (const task of result.results) {
    const nextRunAt = calculateNextScheduledRunAt(task.interval_minutes, task.next_run_at, now);
    const reserved = await env.DB.prepare(`
      UPDATE tasks
      SET next_run_at = ?, updated_at = ?
      WHERE id = ?
        AND enabled = 1
        AND deleted_at IS NULL
        AND next_run_at = ?
    `).bind(nextRunAt, nowIso, task.id, task.next_run_at).run();

    if (reserved.meta.changes === 0) continue;

    const message: QueueMessageBody = {
      taskId: task.id,
      triggerType: "cron"
    };
    await env.TASK_QUEUE.send(message);
    queued += 1;
  }

  return queued;
}
