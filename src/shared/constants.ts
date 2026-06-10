export const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"] as const;

export const BODY_TYPES = ["raw", "json"] as const;

export const TASK_STATUSES = ["success", "failed", "error", "timeout", "queued", "never_run"] as const;

export const TRIGGER_TYPES = ["cron", "manual", "retry"] as const;

export const SENSITIVE_HEADER_KEYS = [
  "authorization",
  "x-api-key",
  "cookie",
  "set-cookie",
  "proxy-authorization"
] as const;

export const DEFAULT_TASK_VALUES = {
  method: "GET",
  body_type: "raw",
  interval_minutes: 10,
  timeout_ms: 10000,
  max_retries: 0,
  enabled: true
} as const;

export const LIMITS = {
  nameMaxLength: 80,
  timeoutMinMs: 1000,
  timeoutMaxMs: 60000,
  requestBodyPreview: 2000,
  responseBodyPreview: 5000,
  dueTaskBatchSize: 100,
  defaultPageSize: 20,
  maxPageSize: 100
} as const;
