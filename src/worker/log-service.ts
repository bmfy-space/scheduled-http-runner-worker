import type { HttpMethod, TaskLog, TaskStatus, TriggerType } from "../shared/types";
import type { Env } from "./env";
import { maskHeaders, parseHeadersJson } from "./validation";

type LogRow = {
  id: number;
  task_id: number;
  task_name: string | null;
  trigger_type: string;
  request_method: string | null;
  request_url: string | null;
  request_headers_json: string | null;
  request_body_preview: string | null;
  status: string;
  http_status: number | null;
  duration_ms: number | null;
  response_headers_json: string | null;
  response_body_preview: string | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
};

export type LogFilters = {
  task?: string | null;
  status?: string | null;
  trigger?: string | null;
  method?: string | null;
  from?: string | null;
  to?: string | null;
};

export type InsertLogInput = {
  task_id: number;
  task_name: string;
  trigger_type: TriggerType;
  request_method: HttpMethod;
  request_url: string;
  request_headers_json: string | null;
  request_body_preview: string | null;
  status: TaskStatus;
  http_status: number | null;
  duration_ms: number | null;
  response_headers_json: string | null;
  response_body_preview: string | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

function rowToLog(row: LogRow): TaskLog {
  return {
    id: row.id,
    task_id: row.task_id,
    task_name: row.task_name,
    trigger_type: row.trigger_type as TriggerType,
    request_method: row.request_method as HttpMethod | null,
    request_url: row.request_url,
    request_headers: maskHeaders(parseHeadersJson(row.request_headers_json)),
    request_body_preview: row.request_body_preview,
    status: row.status as TaskStatus,
    http_status: row.http_status,
    duration_ms: row.duration_ms,
    response_headers: maskHeaders(parseHeadersJson(row.response_headers_json)),
    response_body_preview: row.response_body_preview,
    error_message: row.error_message,
    started_at: row.started_at,
    finished_at: row.finished_at,
    created_at: row.created_at
  };
}

export async function insertTaskLog(env: Env, input: InsertLogInput): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO task_logs (
      task_id,
      task_name,
      trigger_type,
      request_method,
      request_url,
      request_headers_json,
      request_body_preview,
      status,
      http_status,
      duration_ms,
      response_headers_json,
      response_body_preview,
      error_message,
      started_at,
      finished_at,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.task_id,
    input.task_name,
    input.trigger_type,
    input.request_method,
    input.request_url,
    input.request_headers_json,
    input.request_body_preview,
    input.status,
    input.http_status,
    input.duration_ms,
    input.response_headers_json,
    input.response_body_preview,
    input.error_message,
    input.started_at,
    input.finished_at,
    new Date().toISOString()
  ).run();
}

export async function listTaskLogs(env: Env, taskId: number, limit: number, offset: number): Promise<TaskLog[]> {
  const result = await env.DB.prepare(`
    SELECT *
    FROM task_logs
    WHERE task_id = ?
    ORDER BY started_at DESC, id DESC
    LIMIT ? OFFSET ?
  `).bind(taskId, limit, offset).all<LogRow>();

  return result.results.map(rowToLog);
}

export async function listLogs(env: Env, filters: LogFilters, limit: number, offset: number): Promise<TaskLog[]> {
  const where: string[] = [];
  const binds: unknown[] = [];

  if (filters.task) {
    where.push("(CAST(task_id AS TEXT) = ? OR task_name LIKE ?)");
    binds.push(filters.task, `%${filters.task}%`);
  }

  if (filters.status) {
    where.push("status = ?");
    binds.push(filters.status);
  }

  if (filters.trigger) {
    where.push("trigger_type = ?");
    binds.push(filters.trigger);
  }

  if (filters.method) {
    where.push("request_method = ?");
    binds.push(filters.method.toUpperCase());
  }

  if (filters.from) {
    where.push("started_at >= ?");
    binds.push(filters.from);
  }

  if (filters.to) {
    where.push("started_at <= ?");
    binds.push(filters.to);
  }

  const result = await env.DB.prepare(`
    SELECT *
    FROM task_logs
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY started_at DESC, id DESC
    LIMIT ? OFFSET ?
  `).bind(...binds, limit, offset).all<LogRow>();

  return result.results.map(rowToLog);
}

export async function getLog(env: Env, id: number): Promise<TaskLog | null> {
  const row = await env.DB.prepare(`
    SELECT *
    FROM task_logs
    WHERE id = ?
  `).bind(id).first<LogRow>();

  return row ? rowToLog(row) : null;
}

export function parseLogFilters(url: URL): LogFilters {
  return {
    task: url.searchParams.get("task"),
    status: url.searchParams.get("status"),
    trigger: url.searchParams.get("trigger"),
    method: url.searchParams.get("method"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to")
  };
}
