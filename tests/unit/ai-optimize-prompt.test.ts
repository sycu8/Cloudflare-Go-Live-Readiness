import { describe, it, expect } from "vitest";
import { buildOptimizePrompt } from "../../workers/src/prompt.js";

describe("AI optimize prompt", () => {
  it("includes framework and findings in prompt", () => {
    const prompt = buildOptimizePrompt({
      framework: "nextjs",
      deploymentTarget: "vercel",
      focus: "migration",
      findings: [
        {
          id: "migration-1",
          category: "migration",
          severity: "blocker",
          title: "Runtime blocker: fs",
          description: "fs usage detected",
          recommendation: "Use R2",
          affectedFiles: ["app/api/upload/route.ts"],
        },
      ],
      fileSnippets: [{ path: "app/api/upload/route.ts", content: "import fs from 'fs'" }],
    });

    expect(prompt).toContain("nextjs");
    expect(prompt).toContain("Runtime blocker: fs");
    expect(prompt).toContain("app/api/upload/route.ts");
    expect(prompt).toContain("valid JSON only");
  });
});
