import { describe, it, expect } from "vitest";
import {
  buildFindingAgentPrompt,
  buildReportAgentPrompt,
  generateAiFixPromptsReport,
  getFixSteps,
} from "../../src/generators/fix-guidance.js";
import type { Finding } from "../../src/config/schema.js";
import { generateMarkdownReport } from "../../src/generators/markdown-report.js";
import { createScanContext } from "../../src/core/context.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

const sampleFinding: Finding = {
  id: "migration-fs",
  category: "migration",
  severity: "blocker",
  title: "Filesystem API usage",
  description: "Node fs imports are incompatible with Workers.",
  recommendation: "Replace fs with R2 or KV.",
  remediation: {
    steps: [
      "Replace filesystem reads/writes with R2 bindings or fetch().",
      "Use Workers KV for small configuration blobs.",
    ],
    docsUrl: "https://developers.cloudflare.com/r2/",
    estimatedEffort: "hours",
  },
  autoFixAvailable: false,
  requiresApproval: true,
  status: "open",
  affectedFiles: ["src/legacy.ts"],
  evidenceItems: [{ file: "src/legacy.ts", line: 12, snippet: "import fs from 'fs'" }],
};

describe("fix-guidance prompts", () => {
  it("getFixSteps prefers remediation steps", () => {
    expect(getFixSteps(sampleFinding)[0]).toMatch(/R2/);
    expect(
      getFixSteps({
        ...sampleFinding,
        remediation: undefined,
      })[0],
    ).toBe("Replace fs with R2 or KV.");
  });

  it("buildFindingAgentPrompt includes guidance and copy-paste task", () => {
    const prompt = buildFindingAgentPrompt(sampleFinding, {
      projectName: "demo",
      framework: "nextjs",
      packageManager: "npm",
      deploymentTarget: "vercel",
    });
    expect(prompt).toContain("Cloudflare Go-Live Readiness");
    expect(prompt).toContain("Filesystem API usage");
    expect(prompt).toContain("src/legacy.ts:12");
    expect(prompt).toContain("Replace filesystem reads/writes");
    expect(prompt).toContain("Your task");
    expect(prompt).toContain("https://developers.cloudflare.com/r2/");
  });

  it("buildReportAgentPrompt batches findings", () => {
    const prompt = buildReportAgentPrompt([sampleFinding], { framework: "nextjs" });
    expect(prompt).toContain("Open findings");
    expect(prompt).toContain("migration-fs");
    expect(prompt).toContain("Fix blockers");
  });

  it("generateAiFixPromptsReport contains per-finding prompts", () => {
    const md = generateAiFixPromptsReport([sampleFinding], { projectName: "demo" });
    expect(md).toContain("# CF Ready — AI Agent Fix Prompts");
    expect(md).toContain("Fix all priority findings");
    expect(md).toContain("Per-finding prompts");
    expect(md).toContain("migration-fs");
  });

  it("markdown report embeds how-to-fix and AI prompts", async () => {
    const context = await createScanContext({ rootDir: path.join(fixtures, "static-site") });
    const md = generateMarkdownReport(context);
    expect(md).toContain("Fix with an AI agent");
    expect(md).toContain("How to fix:");
    expect(md).toContain("AI agent prompt");
    expect(md).toContain("cf-ready-ai-fix-prompts.md");
  });
});
