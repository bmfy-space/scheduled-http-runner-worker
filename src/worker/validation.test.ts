import { describe, expect, it } from "vitest";
import { isSafeTargetUrl, maskHeaderValue, validateTaskInput } from "./validation";

describe("validation", () => {
  it("accepts public http and https URLs", () => {
    expect(isSafeTargetUrl("https://example.com/hook")).toBe(true);
    expect(isSafeTargetUrl("http://api.example.com/sync")).toBe(true);
  });

  it("rejects localhost and private network URLs", () => {
    expect(isSafeTargetUrl("http://localhost:3000")).toBe(false);
    expect(isSafeTargetUrl("http://127.0.0.1")).toBe(false);
    expect(isSafeTargetUrl("http://10.0.0.8")).toBe(false);
    expect(isSafeTargetUrl("http://172.16.0.8")).toBe(false);
    expect(isSafeTargetUrl("http://192.168.1.10")).toBe(false);
    expect(isSafeTargetUrl("http://169.254.1.1")).toBe(false);
    expect(isSafeTargetUrl("http://[::1]")).toBe(false);
  });

  it("masks sensitive header values", () => {
    expect(maskHeaderValue("Authorization", "Bearer abcdef1234")).toBe("Bearer ****1234");
    expect(maskHeaderValue("X-Trace", "abcdef1234")).toBe("abcdef1234");
  });

  it("validates json body mode", () => {
    const result = validateTaskInput({
      name: "Sync",
      url: "https://example.com/api",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body_type: "json",
      body: "{bad-json",
      interval_minutes: 10,
      timeout_ms: 10000,
      max_retries: 0,
      enabled: true
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.body).toContain("valid JSON");
  });

  it("normalizes a valid task input", () => {
    const result = validateTaskInput({
      name: "  Sync  ",
      url: "https://example.com/api",
      method: "post",
      headers: { Authorization: "Bearer secret-token" },
      body_type: "raw",
      body: "payload",
      interval_minutes: 5,
      timeout_ms: 2000,
      max_retries: 0,
      enabled: false,
      notes: "  manual  "
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Sync");
      expect(result.data.method).toBe("POST");
      expect(result.data.enabled).toBe(false);
      expect(result.data.notes).toBe("manual");
    }
  });
});
