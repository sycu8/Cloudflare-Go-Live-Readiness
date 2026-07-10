import { describe, it, expect } from "vitest";
import type { Env } from "../../workers/src/types.js";
import { checkRateLimit, checkRateLimitSafe } from "../../workers/src/rate-limit.js";

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

  it("checkRateLimitSafe allows traffic when KV throws", async () => {
    const env = {
      SESSIONS: {
        get: async () => {
          throw new Error("KV unavailable");
        },
      },
    } as unknown as Env;
    const result = await checkRateLimitSafe(
      env,
      mockRequest(),
      "/api/sessions/abc/status",
      "abc",
    );
    expect(result.allowed).toBe(true);
  });
});
