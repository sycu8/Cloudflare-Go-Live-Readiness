import { describe, it, expect } from "vitest";
import type { Env } from "../../workers/src/types.js";
import { checkRateLimit } from "../../workers/src/rate-limit.js";

function mockRequest(ip = "203.0.113.1"): Request {
  return new Request("https://example.com/api/sessions/abc/status", {
    headers: { "CF-Connecting-IP": ip },
  });
}

describe("checkRateLimit", () => {
  it("allows requests under the status limit", async () => {
    const env = {} as Env;
    const request = mockRequest();
    const pathname = "/api/sessions/abc/status";

    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(env, request, pathname, "abc");
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks when status limit exceeded", async () => {
    const env = {} as Env;
    const request = mockRequest("203.0.113.99");
    const pathname = "/api/sessions/xyz/status";

    let last = await checkRateLimit(env, request, pathname, "xyz");
    for (let i = 0; i < 120; i++) {
      last = await checkRateLimit(env, request, pathname, "xyz");
    }
    expect(last.allowed).toBe(false);
    expect(last.retryAfterSec).toBeGreaterThan(0);
  });
});
