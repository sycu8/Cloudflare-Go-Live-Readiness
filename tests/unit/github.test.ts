import { describe, it, expect } from "vitest";
import { parseGitHubRepoUrl, validateGitHubUrl } from "../../workers/src/github.js";

describe("github import", () => {
  it("parses standard repo URL", () => {
    const parsed = parseGitHubRepoUrl("https://github.com/sycu8/cloudflare-go-live-readiness");
    expect(parsed).toEqual({
      owner: "sycu8",
      repo: "cloudflare-go-live-readiness",
      ref: "HEAD",
    });
  });

  it("builds tarball URL", () => {
    expect(validateGitHubUrl("https://github.com/sycu8/cloudflare-go-live-readiness")).toBe(
      "https://codeload.github.com/sycu8/cloudflare-go-live-readiness/tar.gz/HEAD",
    );
  });

  it("parses owner/repo shorthand", () => {
    const parsed = parseGitHubRepoUrl("sycu8/testquotetool");
    expect(parsed).toEqual({
      owner: "sycu8",
      repo: "testquotetool",
      ref: "HEAD",
    });
  });

  it("rejects non-github URLs", () => {
    expect(() => validateGitHubUrl("https://gitlab.com/foo/bar")).toThrow();
  });
});
