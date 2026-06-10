import { describe, expect, it } from "vitest";
import type { AppEnv } from "./env";
import { requireAuth, timingSafeEqual } from "./auth";

function env(token: string | undefined): AppEnv {
  return {
    ADMIN_TOKEN: token,
    DB: {} as D1Database,
    TASK_QUEUE: {} as Queue,
    ASSETS: {} as Fetcher
  };
}

describe("auth", () => {
  it("compares strings without accepting prefix matches", () => {
    expect(timingSafeEqual("Bearer secret", "Bearer secret")).toBe(true);
    expect(timingSafeEqual("Bearer secret", "Bearer secre")).toBe(false);
    expect(timingSafeEqual("Bearer secret", "Bearer secret2")).toBe(false);
  });

  it("accepts the expected bearer token", () => {
    const request = new Request("https://example.com/api/tasks", {
      headers: { authorization: "Bearer local-token" }
    });

    expect(requireAuth(request, env("local-token"))).toBeNull();
  });

  it("rejects invalid tokens", () => {
    const request = new Request("https://example.com/api/tasks", {
      headers: { authorization: "Bearer wrong" }
    });

    expect(requireAuth(request, env("local-token"))?.status).toBe(401);
  });
});
