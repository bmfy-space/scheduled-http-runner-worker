import { LIMITS } from "../shared/constants";
import type { Env, QueueMessageBody } from "./env";

type DueTaskRow = {
  id: number;
};

export async function scheduleDueTasks(env: Env): Promise<number> {
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`
    SELECT id
    FROM tasks
    WHERE enabled = 1
      AND deleted_at IS NULL
      AND next_run_at IS NOT NULL
      AND next_run_at <= ?
    ORDER BY next_run_at ASC
    LIMIT ?
  `).bind(now, LIMITS.dueTaskBatchSize).all<DueTaskRow>();

  for (const task of result.results) {
    const message: QueueMessageBody = {
      taskId: task.id,
      triggerType: "cron"
    };
    await env.TASK_QUEUE.send(message);
  }

  return result.results.length;
}
