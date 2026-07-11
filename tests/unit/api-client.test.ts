import { describe, it, expect } from "vitest";
import { execWaitTimeoutMs, normalizeGitHubRepoUrl, sessionPollDelayMs } from "../../web/src/api/client.js";
import {
  LONG_EXEC_WAIT_MS,
  MEDIUM_EXEC_WAIT_MS,
  SHORT_EXEC_WAIT_MS,
} from "../../src/shared/exec-timeouts.js";

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
    expect(execWaitTimeoutMs("scan")).toBe(LONG_EXEC_WAIT_MS);
    expect(execWaitTimeoutMs("cf-ready scan")).toBe(LONG_EXEC_WAIT_MS);
    expect(execWaitTimeoutMs("report")).toBe(LONG_EXEC_WAIT_MS);
    expect(execWaitTimeoutMs("ai-optimize")).toBe(LONG_EXEC_WAIT_MS);
    expect(execWaitTimeoutMs("security-scan")).toBe(LONG_EXEC_WAIT_MS);
    expect(execWaitTimeoutMs("ai-ready")).toBe(MEDIUM_EXEC_WAIT_MS);
    expect(execWaitTimeoutMs("inspect")).toBe(SHORT_EXEC_WAIT_MS);
  });

  it("sessionPollDelayMs backs off to reduce status polling load", () => {
    expect(sessionPollDelayMs(0)).toBe(1500);
    expect(sessionPollDelayMs(119_999)).toBe(1500);
    expect(sessionPollDelayMs(120_000)).toBe(2500);
    expect(sessionPollDelayMs(599_999)).toBe(2500);
    expect(sessionPollDelayMs(600_000)).toBe(4000);
  });
});
