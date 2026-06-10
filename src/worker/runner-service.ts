import { LIMITS } from "../shared/constants";
import type { HttpMethod, TaskDetail, TaskStatus, TriggerType } from "../shared/types";
import type { AppEnv } from "./env";
import { insertTaskLog } from "./log-service";
import { calculateNextRunAt, getTask, recordTaskRunResult } from "./task-service";
import { isSafeTargetUrl } from "./validation";

type RunOutcome = {
  status: TaskStatus;
  httpStatus: number | null;
  durationMs: number;
  responseHeaders: Record<string, string>;
  responseBodyPreview: string | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string;
};

export function truncatePreview(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export function buildRequestInit(task: TaskDetail, signal: AbortSignal): RequestInit {
  const method = task.method.toUpperCase() as HttpMethod;
  const init: RequestInit = {
    method,
    headers: task.headers,
    signal
  };

  if (!["GET", "HEAD"].includes(method) && task.body) {
    init.body = task.body;
  }

  return init;
}

export async function readResponsePreview(response: Response, maxLength: number = LIMITS.responseBodyPreview): Promise<string | null> {
  if (!response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let preview = "";

  try {
    while (preview.length < maxLength) {
      const { done, value } = await reader.read();
      if (done) break;
      preview += decoder.decode(value, { stream: true });
    }
    preview += decoder.decode();
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  return truncatePreview(preview, maxLength);
}

async function executeTask(task: TaskDetail): Promise<RunOutcome> {
  const started = new Date();
  const startedAt = started.toISOString();
  const startMs = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), task.timeout_ms);

  let status: TaskStatus = "success";
  let httpStatus: number | null = null;
  let responseHeaders: Record<string, string> = {};
  let responseBodyPreview: string | null = null;
  let errorMessage: string | null = null;

  try {
    if (!isSafeTargetUrl(task.url)) {
      throw new Error("Blocked unsafe target URL");
    }

    const response = await fetch(task.url, buildRequestInit(task, controller.signal));
    httpStatus = response.status;
    responseHeaders = Object.fromEntries(response.headers.entries());
    responseBodyPreview = await readResponsePreview(response);
    if (!response.ok) status = "failed";
  } catch (error) {
    const err = error as Error;
    status = err.name === "AbortError" ? "timeout" : "error";
    errorMessage = err.message || String(error);
  } finally {
    clearTimeout(timeout);
  }

  const finishedAt = new Date().toISOString();
  return {
    status,
    httpStatus,
    durationMs: Date.now() - startMs,
    responseHeaders,
    responseBodyPreview,
    errorMessage,
    startedAt,
    finishedAt
  };
}

export async function runTaskById(env: AppEnv, taskId: number, triggerType: TriggerType = "cron"): Promise<void> {
  const task = await getTask(env, taskId, false);
  if (!task) return;
  if (!task.enabled && triggerType === "cron") return;

  const outcome = await executeTask(task);
  const nextRunAt = calculateNextRunAt(task.interval_minutes);

  await insertTaskLog(env, {
    task_id: task.id,
    task_name: task.name,
    trigger_type: triggerType,
    request_method: task.method,
    request_url: task.url,
    request_headers_json: JSON.stringify(task.headers),
    request_body_preview: truncatePreview(task.body, LIMITS.requestBodyPreview),
    status: outcome.status,
    http_status: outcome.httpStatus,
    duration_ms: outcome.durationMs,
    response_headers_json: JSON.stringify(outcome.responseHeaders),
    response_body_preview: outcome.responseBodyPreview,
    error_message: outcome.errorMessage,
    started_at: outcome.startedAt,
    finished_at: outcome.finishedAt
  });

  await recordTaskRunResult(env, task.id, outcome.status, outcome.httpStatus, outcome.finishedAt, nextRunAt);
}
