import { describe, expect, it } from "vitest";
import type { TaskDetail } from "../shared/types";
import { buildRequestInit, readResponsePreview, truncatePreview } from "./runner-service";

const baseTask: TaskDetail = {
  id: 1,
  name: "Sync",
  url: "https://example.com/api",
  method: "POST",
  enabled: true,
  interval_minutes: 10,
  timeout_ms: 10000,
  max_retries: 0,
  next_run_at: null,
  last_run_at: null,
  last_status: null,
  last_http_status: null,
  notes: null,
  created_at: "2026-06-10T00:00:00.000Z",
  updated_at: "2026-06-10T00:00:00.000Z",
  headers: { "Content-Type": "application/json" },
  body: "{\"ok\":true}",
  body_type: "json",
  retry_count: 0
};

describe("runner-service", () => {
  it("truncates previews", () => {
    expect(truncatePreview("abcdef", 3)).toBe("abc");
    expect(truncatePreview("", 3)).toBeNull();
  });

  it("omits request body for GET and HEAD", () => {
    const controller = new AbortController();
    const getInit = buildRequestInit({ ...baseTask, method: "GET" }, controller.signal);
    const postInit = buildRequestInit(baseTask, controller.signal);

    expect(getInit.body).toBeUndefined();
    expect(postInit.body).toBe("{\"ok\":true}");
  });

  it("reads bounded response preview", async () => {
    const response = new Response("0123456789");

    await expect(readResponsePreview(response, 4)).resolves.toBe("0123");
  });
});
