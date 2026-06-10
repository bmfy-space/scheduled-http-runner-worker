CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  headers_json TEXT,
  body TEXT,
  body_type TEXT NOT NULL DEFAULT 'raw',
  cron_expr TEXT,
  interval_minutes INTEGER NOT NULL DEFAULT 10,
  enabled INTEGER NOT NULL DEFAULT 1,
  timeout_ms INTEGER NOT NULL DEFAULT 10000,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 0,
  next_run_at TEXT,
  last_run_at TEXT,
  last_status TEXT,
  last_http_status INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_due
ON tasks (enabled, deleted_at, next_run_at);

CREATE INDEX IF NOT EXISTS idx_tasks_method
ON tasks (method);

CREATE INDEX IF NOT EXISTS idx_tasks_last_status
ON tasks (last_status);

CREATE TABLE IF NOT EXISTS task_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  task_name TEXT,
  trigger_type TEXT NOT NULL,
  request_method TEXT,
  request_url TEXT,
  request_headers_json TEXT,
  request_body_preview TEXT,
  status TEXT NOT NULL,
  http_status INTEGER,
  duration_ms INTEGER,
  response_headers_json TEXT,
  response_body_preview TEXT,
  error_message TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_task_logs_task_time
ON task_logs (task_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_logs_status_time
ON task_logs (status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_logs_trigger_time
ON task_logs (trigger_type, started_at DESC);
