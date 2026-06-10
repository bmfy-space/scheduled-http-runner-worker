import { BODY_TYPES, DEFAULT_TASK_VALUES, HTTP_METHODS, LIMITS, SENSITIVE_HEADER_KEYS } from "../shared/constants";
import type { BodyType, HttpMethod, TaskInput } from "../shared/types";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

export function isHttpMethod(value: unknown): value is HttpMethod {
  return typeof value === "string" && HTTP_METHODS.includes(value.toUpperCase() as HttpMethod);
}

export function isBodyType(value: unknown): value is BodyType {
  return typeof value === "string" && BODY_TYPES.includes(value as BodyType);
}

export function isSensitiveHeaderKey(key: string): boolean {
  return SENSITIVE_HEADER_KEYS.includes(key.trim().toLowerCase() as (typeof SENSITIVE_HEADER_KEYS)[number]);
}

export function maskHeaderValue(key: string, value: string): string {
  if (!isSensitiveHeaderKey(key)) return value;
  if (!value) return "";

  const authPrefix = value.match(/^([A-Za-z]+)\s+/)?.[0] ?? "";
  const tail = value.slice(-4);
  return `${authPrefix}****${tail}`;
}

export function maskHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, maskHeaderValue(key, value)]));
}

export function parseHeadersJson(headersJson: string | null | undefined): Record<string, string> {
  if (!headersJson) return {};
  try {
    const parsed = JSON.parse(headersJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, typeof value === "string" ? value : String(value)])
    );
  } catch {
    return {};
  }
}

export function parseJsonObject(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries: Array<[string, string]> = [];
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = rawKey.trim();
    if (!key) return null;
    entries.push([key, typeof rawValue === "string" ? rawValue : String(rawValue)]);
  }
  return Object.fromEntries(entries);
}

export function isSafeTargetUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return false;

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname) return false;
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;
  if (hostname === "::1" || hostname === "0:0:0:0:0:0:0:1") return false;

  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return true;

  const octets = ipv4.slice(1).map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return false;

  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;

  return true;
}

export function validateTaskInput(value: unknown, existingHeaders?: Record<string, string>): ValidationResult<TaskInput> {
  const errors: Record<string, string> = {};
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

  const name = typeof source.name === "string" ? source.name.trim() : "";
  if (!name) errors.name = "Name is required";
  if (name.length > LIMITS.nameMaxLength) errors.name = `Name must be ${LIMITS.nameMaxLength} characters or less`;

  const url = typeof source.url === "string" ? source.url.trim() : "";
  if (!url) errors.url = "URL is required";
  else if (!isSafeTargetUrl(url)) errors.url = "URL must be public http(s) and cannot target localhost or private networks";

  const method = isHttpMethod(source.method) ? source.method.toUpperCase() as HttpMethod : DEFAULT_TASK_VALUES.method;
  const bodyType = isBodyType(source.body_type) ? source.body_type : DEFAULT_TASK_VALUES.body_type;
  const body = typeof source.body === "string" && source.body.length > 0 ? source.body : null;

  if (bodyType === "json" && body) {
    try {
      JSON.parse(body);
    } catch {
      errors.body = "Body must be valid JSON when body type is json";
    }
  }

  const headers = parseJsonObject(source.headers ?? {});
  if (!headers) {
    errors.headers = "Headers must be key-value pairs with non-empty keys";
  }

  const mergedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    const existingValue = existingHeaders?.[key];
    mergedHeaders[key] = isSensitiveHeaderKey(key) && value.includes("****") && existingValue ? existingValue : value;
  }

  const intervalMinutes = Number(source.interval_minutes ?? DEFAULT_TASK_VALUES.interval_minutes);
  if (!Number.isInteger(intervalMinutes) || intervalMinutes < 1) {
    errors.interval_minutes = "Interval minutes must be an integer greater than 0";
  }

  const timeoutMs = Number(source.timeout_ms ?? DEFAULT_TASK_VALUES.timeout_ms);
  if (!Number.isInteger(timeoutMs) || timeoutMs < LIMITS.timeoutMinMs || timeoutMs > LIMITS.timeoutMaxMs) {
    errors.timeout_ms = `Timeout must be between ${LIMITS.timeoutMinMs} and ${LIMITS.timeoutMaxMs} ms`;
  }

  const maxRetries = Number(source.max_retries ?? DEFAULT_TASK_VALUES.max_retries);
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 10) {
    errors.max_retries = "Max retries must be an integer between 0 and 10";
  }

  const enabled = typeof source.enabled === "boolean" ? source.enabled : DEFAULT_TASK_VALUES.enabled;
  const notes = typeof source.notes === "string" && source.notes.trim() ? source.notes.trim() : null;

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      url,
      method,
      headers: mergedHeaders,
      body,
      body_type: bodyType,
      interval_minutes: intervalMinutes,
      timeout_ms: timeoutMs,
      max_retries: maxRetries,
      enabled,
      notes
    }
  };
}
