import path from "node:path";
import { createFinding, createPassedFinding } from "../../core/findings.js";
import { fileExists } from "../../core/filesystem.js";
import type { CfReadyConfig, Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";

const AI_FILES = [
  { path: "public/robots.txt", title: "robots.txt" },
  { path: "public/sitemap.xml", title: "sitemap.xml" },
  { path: "public/llms.txt", title: "llms.txt" },
  { path: "public/llms-full.txt", title: "llms-full.txt" },
];

export async function checkAiFiles(inspection: RepositoryInspection): Promise<Finding[]> {
  const findings: Finding[] = [];

  for (const { path: filePath, title } of AI_FILES) {
    const exists =
      inspection.importantFiles[filePath] ||
      inspection.detectedFiles.includes(filePath) ||
      (await fileExists(path.join(inspection.rootDir, filePath)));

    if (exists) {
      findings.push(
        createPassedFinding("ai-readiness", `${title} present`, `${title} found in project.`),
      );
    } else {
      findings.push(
        createFinding({
          category: "ai-readiness",
          severity: "medium",
          title: `Missing ${title}`,
          description: `${title} not found. AI crawlers and agents use these files for discovery.`,
          recommendation: `Run cf-ready fix --ai-readiness to generate a draft ${title}.`,
          autoFixAvailable: true,
          requiresApproval: false,
        }),
      );
    }
  }

  return findings;
}

export async function checkApiDocs(inspection: RepositoryInspection): Promise<Finding[]> {
  const findings: Finding[] = [];
  const openapiFiles = ["openapi.json", "openapi.yaml", "public/openapi.json"];

  const hasOpenApi = openapiFiles.some(
    (f) => inspection.detectedFiles.includes(f) || inspection.importantFiles[f],
  );

  if (inspection.apiRoutes.length > 0 && !hasOpenApi) {
    findings.push(
      createFinding({
        category: "ai-readiness",
        severity: "medium",
        title: "API routes without OpenAPI documentation",
        description: `${inspection.apiRoutes.length} API route(s) detected without OpenAPI spec.`,
        evidence: inspection.apiRoutes.slice(0, 10).join(", "),
        recommendation: "Generate openapi.json draft with cf-ready fix --ai-readiness.",
        autoFixAvailable: true,
        requiresApproval: false,
      }),
    );
  } else if (hasOpenApi) {
    findings.push(
      createPassedFinding("ai-readiness", "OpenAPI documentation present", "OpenAPI spec found."),
    );
  }

  const hasMcp = inspection.detectedFiles.includes("mcp-server-card.json");
  if (!hasMcp && inspection.apiRoutes.length > 0) {
    findings.push(
      createFinding({
        category: "ai-readiness",
        severity: "low",
        title: "No MCP server card",
        description: "mcp-server-card.json not found for agent discovery.",
        recommendation: "Run cf-ready fix --ai-readiness to generate a draft MCP server card.",
        autoFixAvailable: true,
        requiresApproval: false,
      }),
    );
  }

  const hasAuthDoc = inspection.detectedFiles.includes("auth.md");
  if (inspection.hasAuthPatterns && !hasAuthDoc) {
    findings.push(
      createFinding({
        category: "ai-readiness",
        severity: "low",
        title: "Auth patterns detected without auth.md",
        description: "Authentication flows should be documented for AI agents.",
        recommendation: "Run cf-ready fix --ai-readiness to generate auth.md draft.",
        autoFixAvailable: true,
        requiresApproval: false,
      }),
    );
  }

  return findings;
}

export async function runAiReadinessChecks(
  inspection: RepositoryInspection,
  _config: CfReadyConfig,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  findings.push(...(await checkAiFiles(inspection)));
  findings.push(...(await checkApiDocs(inspection)));
  return findings;
}

export function generateAiReadinessReport(
  inspection: RepositoryInspection,
  findings: Finding[],
): string {
  const aiFindings = findings.filter((f) => f.category === "ai-readiness");
  const lines = [
    "# AI Readiness Report",
    "",
    `**Project:** ${inspection.projectName}`,
    `**AI policy:** allow-assistive-agents`,
    "",
    "## Summary",
    "",
    `Total findings: ${aiFindings.length}`,
    "",
    "## Findings",
    "",
  ];

  for (const f of aiFindings) {
    lines.push(`### [${f.severity}] ${f.title}`, "", f.description, "", f.recommendation, "");
  }

  return lines.join("\n");
}
