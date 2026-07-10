import type { ScanContext } from "../core/context.js";
import { sortFindings } from "../core/findings.js";
import type { Finding } from "../config/schema.js";

function formatEvidenceBlock(f: Finding): string[] {
  const lines: string[] = [];
  if (f.evidenceItems?.length) {
    lines.push("**Evidence:**", "");
    lines.push("| File | Line | Snippet |", "| --- | ---: | --- |");
    for (const item of f.evidenceItems.slice(0, 5)) {
      const line = item.line ?? "—";
      const snippet = (item.snippet ?? "").replace(/\|/g, "\\|").slice(0, 80);
      lines.push(`| ${item.file} | ${line} | ${snippet} |`);
    }
    if (f.evidenceItems.length > 5) {
      lines.push(`| … | | +${f.evidenceItems.length - 5} more |`);
    }
    lines.push("");
  } else if (f.evidence) {
    lines.push(`**Evidence:** ${f.evidence}`, "");
  }
  return lines;
}

function formatRemediationBlock(f: Finding): string[] {
  if (!f.remediation?.steps.length) return [];
  const lines = ["**Remediation steps:**", ""];
  for (const step of f.remediation.steps) {
    lines.push(`1. ${step}`);
  }
  if (f.remediation.cfReadyCommand) {
    lines.push("", "```bash", f.remediation.cfReadyCommand, "```");
  }
  if (f.remediation.docsUrl) {
    lines.push("", `Docs: ${f.remediation.docsUrl}`);
  }
  if (f.remediation.wranglerSnippet) {
    lines.push("", "```toml", f.remediation.wranglerSnippet, "```");
  }
  lines.push("");
  return lines;
}

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
      if (b.evidence) lines.push(`  - Evidence: ${b.evidence}`);
    }
    lines.push("");
  }

  if (autoFixes.length > 0) {
    lines.push("## Auto-fixes available", "");
    for (const f of autoFixes) {
      const cmd = f.remediation?.cfReadyCommand ?? "cf-ready fix";
      lines.push(`- ${f.title} → \`${cmd}\``);
    }
    lines.push("");
  }

  lines.push("## Findings", "");
  for (const f of openFindings) {
    lines.push(`### [${f.severity.toUpperCase()}] ${f.title}`, "", f.description, "");
    lines.push(...formatEvidenceBlock(f));
    if (f.affectedFiles?.length) {
      lines.push(`**Files:** ${f.affectedFiles.join(", ")}`, "");
    }
    if (f.confidence) lines.push(`**Confidence:** ${f.confidence}`, "");
    if (f.requiresApproval) lines.push(`**Requires approval:** yes`, "");
    lines.push(...formatRemediationBlock(f));
    lines.push(`**Recommendation:** ${f.recommendation}`, "");
  }

  return lines.filter((l) => l !== undefined).join("\n");
}

export function generateGoLiveChecklist(context: ScanContext): string {
  const items = context.findings.filter((f) => f.severity !== "info" && f.status === "open");
  const lines = [
    "# Go-Live Checklist",
    "",
    `**Project:** ${context.config.projectName ?? context.inspection.projectName}`,
    "",
    "| Status | Severity | Item | Recommendation |",
    "|--------|----------|------|----------------|",
  ];

  for (const f of items) {
    const status = f.severity === "passed" ? "✅" : "⬜";
    const rec = f.recommendation.replace(/\|/g, "\\|").slice(0, 80);
    lines.push(`| ${status} | ${f.severity} | ${f.title} | ${rec} |`);
  }

  return lines.join("\n");
}
