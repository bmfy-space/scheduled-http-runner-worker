import { LIMITS } from "../shared/constants";
import type { BodyType, HttpMethod, TaskDetail, TaskInput, TaskStatus, TaskSummary } from "../shared/types";
import type { Env } from "./env";
import { maskHeaders, parseHeadersJson } from "./validation";

type TaskRow = {
  id: number;
  name: string;
  url: string;
  method: string;
  headers_json: string | null;
  body: string | null;
  body_type: string | null;
  cron_expr: string | null;
  interval_minutes: number;
  enabled: number;
  timeout_ms: number;
  retry_count: number;
  max_retries: number;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: string | null;
  last_http_status: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TaskFilters = {
  search?: string | null;
  enabled?: boolean | null;
  status?: string | null;
  method?: string | null;
};

export function calculateNextRunAt(intervalMinutes: number, from = new Date()): string {
  return new Date(from.getTime() + intervalMinutes * 60_000).toISOString();
}

function rowToSummary(row: TaskRow): TaskSummary {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    method: row.method as HttpMethod,
    enabled: row.enabled === 1,
    interval_minutes: row.interval_minutes,
    timeout_ms: row.timeout_ms,
    max_retries: row.max_retries,
    next_run_at: row.next_run_at,
    last_run_at: row.last_run_at,
    last_status: row.last_status as TaskStatus | null,
    last_http_status: row.last_http_status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function rowToDetail(row: TaskRow, maskSensitiveHeaders: boolean): TaskDetail {
  const headers = parseHeadersJson(row.headers_json);
  return {
    ...rowToSummary(row),
    headers: maskSensitiveHeaders ? maskHeaders(headers) : headers,
    body: row.body,
    body_type: (row.body_type ?? "raw") as BodyType,
    retry_count: row.retry_count
  };
}

export async function listTasks(env: Env, filters: TaskFilters = {}): Promise<TaskSummary[]> {
  const where = ["deleted_at IS NULL"];
  const binds: unknown[] = [];

  if (filters.search) {
    where.push("(name LIKE ? OR url LIKE ?)");
    binds.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  if (typeof filters.enabled === "boolean") {
    where.push("enabled = ?");
    binds.push(filters.enabled ? 1 : 0);
  }

  if (filters.status) {
    where.push("last_status = ?");
    binds.push(filters.status);
  }

  if (filters.method) {
    where.push("method = ?");
    binds.push(filters.method.toUpperCase());
  }

  const result = await env.DB.prepare(`
    SELECT *
    FROM tasks
    WHERE ${where.join(" AND ")}
    ORDER BY updated_at DESC, id DESC
    LIMIT 200
  `).bind(...binds).all<TaskRow>();

  return result.results.map(rowToSummary);
}

export async function getTask(env: Env, id: number, maskSensitiveHeaders = true): Promise<TaskDetail | null> {
  const row = await env.DB.prepare(`
    SELECT *
    FROM tasks
    WHERE id = ? AND deleted_at IS NULL
  `).bind(id).first<TaskRow>();

  return row ? rowToDetail(row, maskSensitiveHeaders) : null;
}

export async function createTask(env: Env, input: TaskInput): Promise<TaskDetail> {
  const now = new Date().toISOString();
  const nextRunAt = calculateNextRunAt(input.interval_minutes);
  const result = await env.DB.prepare(`
    INSERT INTO tasks (
      name, url, method, headers_json, body, body_type, interval_minutes, enabled,
      timeout_ms, max_retries, next_run_at, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.name,
    input.url,
    input.method,
    JSON.stringify(input.headers),
    input.body,
    input.body_type,
    input.interval_minutes,
    input.enabled ? 1 : 0,
    input.timeout_ms,
    input.max_retries,
    nextRunAt,
    input.notes,
    now,
    now
  ).run();

  const id = Number(result.meta.last_row_id);
  const created = await getTask(env, id);
  if (!created) throw new Error("Created task could not be loaded");
  return created;
}

export async function updateTask(env: Env, id: number, input: TaskInput): Promise<TaskDetail | null> {
  const existing = await getTask(env, id, false);
  if (!existing) return null;

  const now = new Date().toISOString();
  const nextRunAt = input.enabled ? calculateNextRunAt(input.interval_minutes) : existing.next_run_at;

  await env.DB.prepare(`
    UPDATE tasks
    SET name = ?,
        url = ?,
        method = ?,
        headers_json = ?,
        body = ?,
        body_type = ?,
        interval_minutes = ?,
        enabled = ?,
        timeout_ms = ?,
        max_retries = ?,
        next_run_at = ?,
        notes = ?,
        updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `).bind(
    input.name,
    input.url,
    input.method,
    JSON.stringify(input.headers),
    input.body,
    input.body_type,
    input.interval_minutes,
    input.enabled ? 1 : 0,
    input.timeout_ms,
    input.max_retries,
    nextRunAt,
    input.notes,
    now,
    id
  ).run();

  return getTask(env, id);
}

export async function softDeleteTask(env: Env, id: number): Promise<boolean> {
  const result = await env.DB.prepare(`
    UPDATE tasks
    SET deleted_at = ?, updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `).bind(new Date().toISOString(), new Date().toISOString(), id).run();

  return result.meta.changes > 0;
}

export async function setTaskEnabled(env: Env, id: number, enabled: boolean): Promise<TaskDetail | null> {
  const existing = await getTask(env, id, false);
  if (!existing) return null;

  const now = new Date().toISOString();
  const nextRunAt = enabled ? calculateNextRunAt(existing.interval_minutes) : existing.next_run_at;

  await env.DB.prepare(`
    UPDATE tasks
    SET enabled = ?, next_run_at = ?, updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `).bind(enabled ? 1 : 0, nextRunAt, now, id).run();

  return getTask(env, id);
}

export async function recordTaskRunResult(
  env: Env,
  id: number,
  status: TaskStatus,
  httpStatus: number | null,
  finishedAt: string,
  nextRunAt: string
): Promise<void> {
  await env.DB.prepare(`
    UPDATE tasks
    SET last_run_at = ?,
        last_status = ?,
        last_http_status = ?,
        next_run_at = ?,
        updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `).bind(finishedAt, status, httpStatus, nextRunAt, finishedAt, id).run();
}

export function parseTaskFilters(url: URL): TaskFilters {
  const enabledParam = url.searchParams.get("enabled");
  return {
    search: url.searchParams.get("search"),
    enabled: enabledParam === null ? null : enabledParam === "true" || enabledParam === "1",
    status: url.searchParams.get("status"),
    method: url.searchParams.get("method")
  };
}

export function normalizePage(url: URL): { page: number; pageSize: number; offset: number } {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    LIMITS.maxPageSize,
    Math.max(1, Number(url.searchParams.get("page_size") ?? String(LIMITS.defaultPageSize)) || LIMITS.defaultPageSize)
  );

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
}
