import type { AppEnv } from "./env";
import { requireAuth } from "./auth";
import { errorResponse, getPositiveInt, jsonResponse, parsePath, readJson } from "./http";
import { getLog, listLogs, listTaskLogs, parseLogFilters } from "./log-service";
import { runTaskById } from "./runner-service";
import { scheduleDueTasks } from "./scheduler-service";
import {
  createTask,
  getTask,
  listTasks,
  normalizePage,
  parseTaskFilters,
  setTaskEnabled,
  softDeleteTask,
  updateTask
} from "./task-service";
import { validateTaskInput } from "./validation";

function idFromSegment(segment: string | undefined): number | null {
  const id = Number(segment);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function handleApiRequest(request: Request, env: AppEnv): Promise<Response> {
  const url = new URL(request.url);
  const parts = parsePath(request);

  if (parts[0] !== "api") {
    return errorResponse("Not found", 404);
  }

  if (parts[1] === "health") {
    return jsonResponse({ ok: true, service: "scheduled-http-runner" });
  }

  if (parts[1] === "login" && request.method === "POST") {
    const authError = requireAuth(request, env);
    if (authError) return jsonResponse({ ok: false }, 401);
    return jsonResponse({ ok: true });
  }

  const authError = requireAuth(request, env);
  if (authError) return authError;

  if (parts[1] === "tasks") {
    if (request.method === "GET" && parts.length === 2) {
      return jsonResponse({ items: await listTasks(env, parseTaskFilters(url)) });
    }

    if (request.method === "POST" && parts.length === 2) {
      const body = await readJson(request);
      if (!body.ok) return body.response;

      const validation = validateTaskInput(body.value);
      if (!validation.ok) return errorResponse("Task validation failed", 400, validation.errors);

      return jsonResponse(await createTask(env, validation.data), 201);
    }

    const taskId = idFromSegment(parts[2]);
    if (!taskId) return errorResponse("Task id is required", 400);

    if (request.method === "GET" && parts.length === 3) {
      const task = await getTask(env, taskId);
      return task ? jsonResponse(task) : errorResponse("Task not found", 404);
    }

    if (request.method === "PUT" && parts.length === 3) {
      const existing = await getTask(env, taskId, false);
      if (!existing) return errorResponse("Task not found", 404);

      const body = await readJson(request);
      if (!body.ok) return body.response;

      const validation = validateTaskInput(body.value, existing.headers);
      if (!validation.ok) return errorResponse("Task validation failed", 400, validation.errors);

      const task = await updateTask(env, taskId, validation.data);
      return task ? jsonResponse(task) : errorResponse("Task not found", 404);
    }

    if (request.method === "DELETE" && parts.length === 3) {
      const deleted = await softDeleteTask(env, taskId);
      return deleted ? jsonResponse({ ok: true }) : errorResponse("Task not found", 404);
    }

    if (request.method === "PATCH" && parts[3] === "enabled") {
      const body = await readJson(request);
      if (!body.ok) return body.response;

      const value = body.value as { enabled?: unknown };
      if (typeof value.enabled !== "boolean") {
        return errorResponse("enabled must be a boolean", 400, { enabled: "enabled must be a boolean" });
      }

      const task = await setTaskEnabled(env, taskId, value.enabled);
      return task ? jsonResponse(task) : errorResponse("Task not found", 404);
    }

    if (request.method === "POST" && parts[3] === "run") {
      const task = await getTask(env, taskId);
      if (!task) return errorResponse("Task not found", 404);

      await env.TASK_QUEUE.send({ taskId, triggerType: "manual" });
      return jsonResponse({ ok: true, queued: true });
    }

    if (request.method === "GET" && parts[3] === "logs") {
      const page = normalizePage(url);
      const items = await listTaskLogs(env, taskId, page.pageSize + 1, page.offset);
      const hasNext = items.length > page.pageSize;
      return jsonResponse({
        items: items.slice(0, page.pageSize),
        page: { page: page.page, page_size: page.pageSize, has_next: hasNext }
      });
    }
  }

  if (parts[1] === "logs") {
    if (request.method === "GET" && parts.length === 2) {
      const page = normalizePage(url);
      const items = await listLogs(env, parseLogFilters(url), page.pageSize + 1, page.offset);
      const hasNext = items.length > page.pageSize;
      return jsonResponse({
        items: items.slice(0, page.pageSize),
        page: { page: page.page, page_size: page.pageSize, has_next: hasNext }
      });
    }

    if (request.method === "GET" && parts.length === 3) {
      const logId = idFromSegment(parts[2]);
      if (!logId) return errorResponse("Log id is required", 400);
      const log = await getLog(env, logId);
      return log ? jsonResponse(log) : errorResponse("Log not found", 404);
    }
  }

  return errorResponse("Not found", 404);
}

export default {
  async fetch(request: Request, env: AppEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_event: ScheduledEvent, env: AppEnv, _ctx: ExecutionContext): Promise<void> {
    await scheduleDueTasks(env);
  },

  async queue(batch: MessageBatch<unknown>, env: AppEnv): Promise<void> {
    for (const message of batch.messages) {
      try {
        const body = message.body as { taskId?: unknown; triggerType?: unknown };
        if (typeof body.taskId === "number" && (body.triggerType === "cron" || body.triggerType === "manual" || body.triggerType === "retry")) {
          await runTaskById(env, body.taskId, body.triggerType);
        }
        message.ack();
      } catch (error) {
        console.error("Queue message failed", error);
        message.retry();
      }
    }
  }
};
