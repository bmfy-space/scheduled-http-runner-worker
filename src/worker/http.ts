import type { ApiError } from "../shared/types";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8"
};

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

export function errorResponse(error: string, status = 400, fieldErrors?: Record<string, string>): Response {
  const body: ApiError = fieldErrors ? { ok: false, error, field_errors: fieldErrors } : { ok: false, error };
  return jsonResponse(body, status);
}

export async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false, response: errorResponse("Invalid JSON request body", 400) };
  }
}

export function parsePath(request: Request): string[] {
  const url = new URL(request.url);
  return url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
}

export function getPositiveInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
