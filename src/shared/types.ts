import type { BODY_TYPES, HTTP_METHODS, TASK_STATUSES, TRIGGER_TYPES } from "./constants";

export type HttpMethod = (typeof HTTP_METHODS)[number];
export type BodyType = (typeof BODY_TYPES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export type ApiError = {
  ok: false;
  error: string;
  field_errors?: Record<string, string>;
};

export type ApiOk<T> = T & {
  ok?: true;
};

export type PageInfo = {
  page: number;
  page_size: number;
  has_next: boolean;
};

export type TaskInput = {
  name: string;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body: string | null;
  body_type: BodyType;
  interval_minutes: number;
  timeout_ms: number;
  max_retries: number;
  enabled: boolean;
  notes: string | null;
};

export type TaskSummary = {
  id: number;
  name: string;
  url: string;
  method: HttpMethod;
  enabled: boolean;
  interval_minutes: number;
  timeout_ms: number;
  max_retries: number;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: TaskStatus | null;
  last_http_status: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskDetail = TaskSummary & {
  headers: Record<string, string>;
  body: string | null;
  body_type: BodyType;
  retry_count: number;
};

export type TaskLog = {
  id: number;
  task_id: number;
  task_name: string | null;
  trigger_type: TriggerType;
  request_method: HttpMethod | null;
  request_url: string | null;
  request_headers: Record<string, string>;
  request_body_preview: string | null;
  status: TaskStatus;
  http_status: number | null;
  duration_ms: number | null;
  response_headers: Record<string, string>;
  response_body_preview: string | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
};

export type TaskListResponse = {
  items: TaskSummary[];
};

export type TaskLogsResponse = {
  items: TaskLog[];
  page: PageInfo;
};

export type ManualRunResponse = {
  ok: true;
  queued: true;
};
