import { createFinding, createPassedFinding } from "../../core/findings.js";
import type { CfReadyConfig, Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";
import { publicAssetExists } from "../../utils/public-assets.js";

import { getAssetRemediation } from "../../config/remediation-templates.js";

const AI_FILES = [
  { key: "llms.txt" as const, title: "llms.txt", id: "ai-missing-llms-txt" },
  { key: "llms-full.txt" as const, title: "llms-full.txt", id: "ai-missing-llms-full-txt" },
];

export async function checkAiFiles(inspection: RepositoryInspection): Promise<Finding[]> {
  const findings: Finding[] = [];

  for (const { key, title, id } of AI_FILES) {
    const exists = await publicAssetExists(inspection.rootDir, key);

    if (exists) {
      findings.push(
        createPassedFinding("ai-readiness", `${title} present`, `${title} found in project.`),
      );
    } else {
      const fixCmd = "cf-ready fix --ai-readiness";
      findings.push(
        createFinding({
          id,
          category: "ai-readiness",
          severity: "medium",
          title: `Missing ${title}`,
          description: `${title} not found. AI crawlers and agents use these files for discovery.`,
          recommendation: `Run ${fixCmd} to generate a draft ${title}.`,
          remediation: getAssetRemediation(title, fixCmd),
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
        id: "ai-api-openapi",
        category: "ai-readiness",
        severity: "medium",
        title: "API routes without OpenAPI documentation",
        description: `${inspection.apiRoutes.length} API route(s) detected without OpenAPI spec.`,
        evidence: inspection.apiRoutes.slice(0, 10).join(", "),
        recommendation: "Generate openapi.json draft with cf-ready fix --ai-readiness.",
        remediation: getAssetRemediation("openapi.json", "cf-ready fix --ai-readiness"),
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
        id: "ai-mcp-card",
        category: "ai-readiness",
        severity: "low",
        title: "No MCP server card",
        description: "mcp-server-card.json not found for agent discovery.",
        recommendation: "Run cf-ready fix --ai-readiness to generate a draft MCP server card.",
        remediation: getAssetRemediation("mcp-server-card.json", "cf-ready fix --ai-readiness"),
        autoFixAvailable: true,
        requiresApproval: false,
      }),
    );
  }

  const hasAuthDoc = inspection.detectedFiles.includes("auth.md");
  if (inspection.hasAuthPatterns && !hasAuthDoc) {
    findings.push(
      createFinding({
        id: "ai-auth-doc",
        category: "ai-readiness",
        severity: "low",
        title: "Auth patterns detected without auth.md",
        description: "Authentication flows should be documented for AI agents.",
        recommendation: "Run cf-ready fix --ai-readiness to generate auth.md draft.",
        remediation: getAssetRemediation("auth.md", "cf-ready fix --ai-readiness"),
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
    lines.push(`### [${f.severity}] ${f.title}`, "", f.description, "");
    if (f.evidence) lines.push(`**Evidence:** ${f.evidence}`, "");
    if (f.affectedFiles?.length) lines.push(`**Files:** ${f.affectedFiles.join(", ")}`, "");
    if (f.remediation?.steps.length) {
      lines.push("**Remediation steps:**", ...f.remediation.steps.map((s) => `- ${s}`), "");
    }
    lines.push(`**Recommendation:** ${f.recommendation}`, "");
  }

  return lines.join("\n");
}
