import type { ScanContext } from "../core/context.js";
import { sortFindings } from "../core/findings.js";

export function generateMarkdownReport(context: ScanContext): string {
  const { inspection, scores, findings, productionReady, blockers } = context;
  const sorted = sortFindings(findings);
  const openFindings = sorted.filter((f) => f.status === "open" && f.severity !== "passed");
  const autoFixes = sorted.filter((f) => f.autoFixAvailable && f.status === "open");

  const lines = [
    "# Cloudflare Go-Live Readiness Report",
    "",
    `**Project:** ${context.config.projectName ?? inspection.projectName}`,
    `**Framework:** ${inspection.framework}`,
    `**Package manager:** ${inspection.packageManager}`,
    `**Deployment target:** ${inspection.deploymentTarget}`,
    `**Scanned:** ${context.scannedAt}`,
    "",
    `## Overall readiness: ${scores.overall}/100`,
    "",
    productionReady
      ? "✅ **Production ready** (no blockers)"
      : "❌ **Not production ready** (blockers or critical issues present)",
    "",
    "## Category scores",
    "",
    `| Category | Score |`,
    `|----------|------:|`,
    `| Migration | ${scores.migration}/100 |`,
    `| Security | ${scores.security}/100 |`,
    `| AI readiness | ${scores.aiReadiness}/100 |`,
    `| SEO | ${scores.seo}/100 |`,
    `| Deployment | ${scores.deployment}/100 |`,
    "",
  ];

  if (inspection.nextJs) {
    lines.push(`**Next.js router:** ${inspection.nextJs.router}`, "");
  }

  if (blockers.length > 0) {
    lines.push("## Blockers", "");
    for (const b of blockers) {
      lines.push(`- **${b.title}**: ${b.description}`);
    }
    lines.push("");
  }

  if (autoFixes.length > 0) {
    lines.push("## Auto-fixes available", "");
    for (const f of autoFixes) {
      lines.push(`- ${f.title}`);
    }
    lines.push("", "```bash", "cf-ready fix --ai-readiness", "cf-ready fix --seo", "```", "");
  }

  lines.push("## Findings", "");
  for (const f of openFindings.slice(0, 50)) {
    lines.push(
      `### [${f.severity.toUpperCase()}] ${f.title}`,
      "",
      f.description,
      "",
      f.evidence ? `**Evidence:** ${f.evidence}` : "",
      f.affectedFiles?.length ? `**Files:** ${f.affectedFiles.join(", ")}` : "",
      "",
      `**Recommendation:** ${f.recommendation}`,
      "",
    );
  }

  return lines.filter((l) => l !== undefined).join("\n");
}

export function generateGoLiveChecklist(context: ScanContext): string {
  const items = context.findings.filter((f) => f.severity !== "info");
  const lines = [
    "# Go-Live Checklist",
    "",
    `**Project:** ${context.config.projectName ?? context.inspection.projectName}`,
    `**Overall score:** ${context.scores.overall}/100`,
    "",
    "## Checklist",
    "",
  ];

  for (const f of items) {
    const checked = f.severity === "passed" ? "[x]" : "[ ]";
    lines.push(`${checked} ${f.title} (${f.severity})`);
  }

  lines.push(
    "",
    "## Pre-launch commands",
    "",
    "```bash",
    "cf-ready scan",
    "cf-ready deploy-check",
    "cf-ready smoke-test --url <production-url>",
    "```",
    "",
  );

  return lines.join("\n");
}
