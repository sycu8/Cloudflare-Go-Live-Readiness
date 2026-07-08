import { describe, it, expect } from "vitest";
import { getAuthProviderConfig } from "../../workers/src/auth/config.js";

describe("auth config", () => {
  it("detects configured OAuth providers", () => {
    const full = getAuthProviderConfig({
      WORKER_PUBLIC_URL: "https://ready.orangecloud.vn",
      GITHUB_CLIENT_ID: "gh-id",
      GITHUB_CLIENT_SECRET: "gh-secret",
      GOOGLE_CLIENT_ID: "g-id",
      GOOGLE_CLIENT_SECRET: "g-secret",
    } as never);

    expect(full.github).toBe(true);
    expect(full.google).toBe(true);
    expect(full.githubCallbackUrl).toBe(
      "https://ready.orangecloud.vn/api/auth/github/callback",
    );
  });

  it("reports missing secrets", () => {
    const empty = getAuthProviderConfig({
      WORKER_PUBLIC_URL: "https://ready.orangecloud.vn",
    } as never);

    expect(empty.github).toBe(false);
    expect(empty.google).toBe(false);
  });
});
