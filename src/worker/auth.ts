import type { AppEnv } from "./env";
import { errorResponse } from "./http";

const encoder = new TextEncoder();

export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const length = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (aBytes[index] ?? 0) ^ (bBytes[index] ?? 0);
  }

  return diff === 0;
}

export function requireAuth(request: Request, env: AppEnv): Response | null {
  if (!env.ADMIN_TOKEN) {
    return errorResponse("ADMIN_TOKEN is not configured", 500);
  }

  const expected = `Bearer ${env.ADMIN_TOKEN}`;
  const actual = request.headers.get("authorization") ?? "";

  if (!timingSafeEqual(actual, expected)) {
    return errorResponse("Unauthorized", 401);
  }

  return null;
}
