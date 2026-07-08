import { describe, it, expect } from "vitest";
import { normalizeGitHubRepoUrl } from "../../web/src/api/client.js";

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
});
