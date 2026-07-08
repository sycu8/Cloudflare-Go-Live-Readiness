import { describe, it, expect } from "vitest";
import {
  parseAuthCookie,
  authCookieHeader,
  clearAuthCookieHeader,
} from "../../workers/src/auth/session.js";

describe("auth session cookies", () => {
  it("parses cf_ready_auth cookie from header", () => {
    const request = new Request("https://example.com/api/auth/me", {
      headers: {
        Cookie: "other=1; cf_ready_auth=abc-123; foo=bar",
      },
    });
    expect(parseAuthCookie(request)).toBe("abc-123");
  });

  it("returns null when auth cookie is missing", () => {
    const request = new Request("https://example.com/api/auth/me");
    expect(parseAuthCookie(request)).toBeNull();
  });

  it("builds secure auth cookie headers", () => {
    expect(authCookieHeader("sess-1")).toContain("cf_ready_auth=sess-1");
    expect(authCookieHeader("sess-1")).toContain("HttpOnly");
    expect(clearAuthCookieHeader()).toContain("Max-Age=0");
  });
});
