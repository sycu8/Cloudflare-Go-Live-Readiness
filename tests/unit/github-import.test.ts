import { describe, it, expect } from "vitest";
import {
  githubTarballUrl,
  parseGitHubRepoUrl,
  resolveGitHubRef,
} from "../../workers/src/github.js";
import { shellQuote } from "../../workers/src/shell.js";

describe("github import helpers", () => {
  it("builds encoded codeload tarball URLs", () => {
    expect(githubTarballUrl("org", "repo", "main")).toBe(
      "https://codeload.github.com/org/repo/tar.gz/main",
    );
    expect(githubTarballUrl("org", "repo", "feature/foo")).toBe(
      "https://codeload.github.com/org/repo/tar.gz/feature%2Ffoo",
    );
  });

  it("parses owner/repo shorthand", () => {
    expect(parseGitHubRepoUrl("org/repo")?.owner).toBe("org");
    expect(parseGitHubRepoUrl("/org/repo")?.repo).toBe("repo");
  });

  it("shellQuote escapes single quotes", () => {
    expect(shellQuote("it's fine")).toBe(`'it'\\''s fine'`);
    expect(shellQuote("token-value")).toBe("'token-value'");
  });

  it("resolveGitHubRef returns non-HEAD refs unchanged", async () => {
    await expect(resolveGitHubRef("sycu8", "Cloudflare-Go-Live-Readiness", "main")).resolves.toBe(
      "main",
    );
  });
});
