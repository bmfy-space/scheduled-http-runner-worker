import type { ManualRunResponse, TaskDetail, TaskInput, TaskListResponse, TaskLog, TaskLogsResponse } from "../shared/types";

type RequestOptions = {
  method?: string;
  body?: unknown;
};

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export class ApiClient {
  private readonly token: string;
  private readonly onUnauthorized: () => void;

  constructor(token: string, onUnauthorized: () => void) {
    this.token = token;
    this.onUnauthorized = onUnauthorized;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(path, {
      method: options.method ?? "GET",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.token}`
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    const payload = await response.json().catch(() => null) as { error?: string; field_errors?: Record<string, string> } | null;
    if (!response.ok) {
      if (response.status === 401) this.onUnauthorized();
      throw new ApiError(payload?.error ?? "Request failed", response.status, payload?.field_errors);
    }

    return payload as T;
  }

  health(): Promise<{ ok: true; service: string }> {
    return this.request("/api/health");
  }

  listTasks(params: URLSearchParams): Promise<TaskListResponse> {
    const query = params.toString();
    return this.request(`/api/tasks${query ? `?${query}` : ""}`);
  }

  getTask(id: number): Promise<TaskDetail> {
    return this.request(`/api/tasks/${id}`);
  }

  createTask(input: TaskInput): Promise<TaskDetail> {
    return this.request("/api/tasks", { method: "POST", body: input });
  }

  updateTask(id: number, input: TaskInput): Promise<TaskDetail> {
    return this.request(`/api/tasks/${id}`, { method: "PUT", body: input });
  }

  setTaskEnabled(id: number, enabled: boolean): Promise<TaskDetail> {
    return this.request(`/api/tasks/${id}/enabled`, { method: "PATCH", body: { enabled } });
  }

  deleteTask(id: number): Promise<{ ok: true }> {
    return this.request(`/api/tasks/${id}`, { method: "DELETE" });
  }

  runTask(id: number): Promise<ManualRunResponse> {
    return this.request(`/api/tasks/${id}/run`, { method: "POST", body: {} });
  }

  listTaskLogs(id: number, page = 1): Promise<TaskLogsResponse> {
    return this.request(`/api/tasks/${id}/logs?page=${page}&page_size=10`);
  }

  listLogs(params: URLSearchParams): Promise<TaskLogsResponse> {
    const query = params.toString();
    return this.request(`/api/logs${query ? `?${query}` : ""}`);
  }

  getLog(id: number): Promise<TaskLog> {
    return this.request(`/api/logs/${id}`);
  }
}
