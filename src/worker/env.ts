import type { TriggerType } from "../shared/types";

export type QueueMessageBody = {
  taskId: number;
  triggerType: TriggerType;
};

export type AppEnv = Env & {
  TASK_QUEUE: Queue<QueueMessageBody>;
  ADMIN_TOKEN?: string;
  ENVIRONMENT?: string;
};
