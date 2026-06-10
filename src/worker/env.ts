import type { TriggerType } from "../shared/types";

export type QueueMessageBody = {
  taskId: number;
  triggerType: TriggerType;
};

export type Env = {
  DB: D1Database;
  TASK_QUEUE: Queue<QueueMessageBody>;
  ASSETS: Fetcher;
  ADMIN_TOKEN?: string;
  ENVIRONMENT?: string;
};
