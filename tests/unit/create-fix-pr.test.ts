import { describe, it, expect } from "vitest";
import { createFixPullRequest } from "../../src/utils/create-fix-pr.js";

describe("createFixPullRequest", () => {
  it("dry-run reports files without git operations", async () => {
    const result = await createFixPullRequest({
      rootDir: process.cwd(),
      files: ["public/robots.txt", "public/llms.txt"],
      dryRun: true,
      branchName: "cf-ready/test-branch",
    });
    expect(result.dryRun).toBe(true);
    expect(result.branch).toBe("cf-ready/test-branch");
    expect(result.files).toEqual(["public/robots.txt", "public/llms.txt"]);
    expect(result.prUrl).toBeUndefined();
  });

  it("skips when no files", async () => {
    const result = await createFixPullRequest({
      rootDir: process.cwd(),
      files: [],
      dryRun: true,
    });
    expect(result.skippedReason).toMatch(/No generated files/);
  });
});
