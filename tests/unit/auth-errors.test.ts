import { describe, it, expect } from "vitest";
import { oauthNotConfiguredResponse } from "../../workers/src/auth/errors.js";

describe("oauth errors", () => {
  const env = { WORKER_PUBLIC_URL: "https://ready.orangecloud.vn" } as never;

  it("redirects browsers to login with error code", () => {
    const res = oauthNotConfiguredResponse(env, "google", "text/html,application/json");
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      "https://ready.orangecloud.vn/app/?auth_error=google_not_configured",
    );
  });

  it("returns JSON for API clients", async () => {
    const res = oauthNotConfiguredResponse(env, "github", "application/json");
    expect(res.status).toBe(501);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("GITHUB_CLIENT_ID");
  });
});
