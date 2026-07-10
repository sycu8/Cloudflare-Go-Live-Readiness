import { describe, it, expect } from "vitest";
import { execWaitTimeoutMs, normalizeGitHubRepoUrl, sessionPollDelayMs } from "../../web/src/api/client.js";

describe("api client helpers", () => {
  it("normalizeGitHubRepoUrl passes through full URLs", () => {
    expect(normalizeGitHubRepoUrl("https://github.com/org/repo")).toBe(
      "https://github.com/org/repo",
    );
  });

  it("normalizeGitHubRepoUrl expands owner/repo shorthand", () => {
    expect(normalizeGitHubRepoUrl("org/repo")).toBe("https://github.com/org/repo");
    expect(normalizeGitHubRepoUrl("/org/repo")).toBe("https://github.com/org/repo");
  });

  it("normalizeGitHubRepoUrl trims whitespace", () => {
    expect(normalizeGitHubRepoUrl("  org/repo  ")).toBe("https://github.com/org/repo");
  });

  it("normalizeGitHubRepoUrl leaves unknown strings unchanged", () => {
    expect(normalizeGitHubRepoUrl("not-a-repo")).toBe("not-a-repo");
  });

  it("execWaitTimeoutMs uses longer budget for scan-like commands", () => {
    expect(execWaitTimeoutMs("scan")).toBe(900_000);
    expect(execWaitTimeoutMs("cf-ready scan")).toBe(900_000);
    expect(execWaitTimeoutMs("report")).toBe(900_000);
    expect(execWaitTimeoutMs("ai-optimize")).toBe(900_000);
    expect(execWaitTimeoutMs("security-scan")).toBe(900_000);
    expect(execWaitTimeoutMs("ai-ready")).toBe(600_000);
    expect(execWaitTimeoutMs("inspect")).toBe(420_000);
  });

  it("sessionPollDelayMs backs off to reduce status polling load", () => {
    expect(sessionPollDelayMs(0)).toBe(1500);
    expect(sessionPollDelayMs(119_999)).toBe(1500);
    expect(sessionPollDelayMs(120_000)).toBe(2500);
    expect(sessionPollDelayMs(599_999)).toBe(2500);
    expect(sessionPollDelayMs(600_000)).toBe(4000);
  });
});
