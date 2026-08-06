import type { Finding } from "../config/schema.js";
import type { Framework } from "../config/schema.js";

export type FixGuidanceContext = {
  projectName?: string;
  framework?: Framework | string;
  deploymentTarget?: string;
  packageManager?: string;
};

/** Prefer structured remediation steps; fall back to recommendation. */
export function getFixSteps(finding: Finding): string[] {
  if (finding.remediation?.steps?.length) {
    return finding.remediation.steps;
  }
  if (finding.recommendation?.trim()) {
    return [finding.recommendation.trim()];
  }
  return ["Review the finding and apply a Cloudflare-compatible fix."];
}

function evidenceLines(finding: Finding): string[] {
  const lines: string[] = [];
  if (finding.evidenceItems?.length) {
    for (const item of finding.evidenceItems.slice(0, 8)) {
      const loc = item.line ? `${item.file}:${item.line}` : item.file;
      const snippet = item.snippet ? ` — ${item.snippet.slice(0, 120)}` : "";
      lines.push(`- ${loc}${snippet}`);
    }
  } else if (finding.evidence?.trim()) {
    lines.push(`- ${finding.evidence.trim().slice(0, 400)}`);
  }
  if (finding.affectedFiles?.length) {
    lines.push(`- Affected files: ${finding.affectedFiles.slice(0, 12).join(", ")}`);
  }
  return lines;
}

/**
 * Deterministic copy-paste prompt for Cursor, Claude, ChatGPT, Copilot, etc.
 * Offline — no network / Workers AI required.
 */
export function buildFindingAgentPrompt(
  finding: Finding,
  context: FixGuidanceContext = {},
): string {
  const steps = getFixSteps(finding);
  const evidence = evidenceLines(finding);
  const parts = [
    "You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.",
    "Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.",
    "Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).",
    "",
    "## Project context",
    `- Project: ${context.projectName ?? "unknown"}`,
    `- Framework: ${context.framework ?? "unknown"}`,
    `- Package manager: ${context.packageManager ?? "unknown"}`,
    `- Deployment target: ${context.deploymentTarget ?? "unknown"}`,
    "",
    "## Finding",
    `- ID: ${finding.id}`,
    `- Category: ${finding.category}`,
    `- Severity: ${finding.severity}`,
    `- Title: ${finding.title}`,
    `- Description: ${finding.description}`,
  ];

  if (finding.confidence) {
    parts.push(`- Confidence: ${finding.confidence}`);
  }
  if (finding.requiresApproval) {
    parts.push("- Requires human approval: yes — propose the change and wait for review before applying risky edits.");
  }

  if (evidence.length) {
    parts.push("", "## Evidence", ...evidence);
  }

  parts.push("", "## Recommended fix guidance", ...steps.map((s, i) => `${i + 1}. ${s}`));

  if (finding.remediation?.cfReadyCommand) {
    parts.push("", `## cf-ready command (optional)`, finding.remediation.cfReadyCommand);
  }
  if (finding.remediation?.docsUrl) {
    parts.push("", `## Docs`, finding.remediation.docsUrl);
  }
  if (finding.remediation?.wranglerSnippet) {
    parts.push("", "## Suggested wrangler snippet", "```toml", finding.remediation.wranglerSnippet, "```");
  }

  parts.push(
    "",
    "## Your task",
    "1. Inspect the cited files in this repository.",
    "2. Implement or draft the fix following the guidance above.",
    "3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).",
    "4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.",
  );

  return parts.join("\n");
}

/** Multi-finding prompt for fixing the highest-priority open issues in one agent session. */
export function buildReportAgentPrompt(
  findings: Finding[],
  context: FixGuidanceContext = {},
): string {
  const actionable = findings
    .filter((f) => f.status === "open" && f.severity !== "passed" && f.severity !== "info")
    .slice(0, 15);

  const lines = [
    "You are helping me make this project Cloudflare production-ready based on a cf-ready scan.",
    "Work through the findings in order. Prefer minimal, safe changes. Do not deploy automatically.",
    "Do not change auth, payment, or database logic without explicit approval.",
    "",
    "## Project context",
    `- Project: ${context.projectName ?? "unknown"}`,
    `- Framework: ${context.framework ?? "unknown"}`,
    `- Package manager: ${context.packageManager ?? "unknown"}`,
    `- Deployment target: ${context.deploymentTarget ?? "unknown"}`,
    "",
    `## Open findings (${actionable.length})`,
  ];

  for (const [index, f] of actionable.entries()) {
    const steps = getFixSteps(f).slice(0, 3);
    lines.push(
      "",
      `### ${index + 1}. [${f.severity.toUpperCase()}] ${f.title} (\`${f.id}\`)`,
      f.description,
      ...steps.map((s) => `- Fix: ${s}`),
    );
    if (f.affectedFiles?.length) {
      lines.push(`- Files: ${f.affectedFiles.slice(0, 6).join(", ")}`);
    }
  }

  lines.push(
    "",
    "## Your task",
    "1. Fix blockers and high-severity items first.",
    "2. For each change, keep diffs focused and explain why it helps Cloudflare Workers/Pages readiness.",
    "3. After edits, list remaining manual steps (wrangler secrets, DNS, dashboard).",
    "4. If useful, suggest running `cf-ready scan` again to verify.",
  );

  return lines.join("\n");
}

export function formatRemediationMarkdown(finding: Finding): string[] {
  const steps = getFixSteps(finding);
  const lines = ["**How to fix:**", ""];
  for (const [i, step] of steps.entries()) {
    lines.push(`${i + 1}. ${step}`);
  }
  if (finding.remediation?.estimatedEffort) {
    lines.push("", `*Estimated effort: ${finding.remediation.estimatedEffort}*`);
  }
  if (finding.remediation?.cfReadyCommand) {
    lines.push("", "```bash", finding.remediation.cfReadyCommand, "```");
  }
  if (finding.remediation?.docsUrl) {
    lines.push("", `Docs: ${finding.remediation.docsUrl}`);
  }
  if (finding.remediation?.wranglerSnippet) {
    lines.push("", "```toml", finding.remediation.wranglerSnippet, "```");
  }
  lines.push("");
  return lines;
}

export function formatAgentPromptMarkdown(
  finding: Finding,
  context: FixGuidanceContext = {},
): string[] {
  const prompt = buildFindingAgentPrompt(finding, context);
  return [
    "**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):",
    "",
    "````",
    prompt,
    "````",
    "",
  ];
}

export function generateAiFixPromptsReport(
  findings: Finding[],
  context: FixGuidanceContext = {},
): string {
  const actionable = findings.filter(
    (f) => f.status === "open" && f.severity !== "passed" && f.severity !== "info",
  );

  const lines = [
    "# CF Ready — AI Agent Fix Prompts",
    "",
    `**Project:** ${context.projectName ?? "unknown"}`,
    `**Framework:** ${context.framework ?? "unknown"}`,
    "",
    "Copy any prompt below into your AI coding agent to apply a guided fix.",
    "Prompts are generated offline from scan findings (no API call required).",
    "",
    "## Fix all priority findings (batch)",
    "",
    "````",
    buildReportAgentPrompt(actionable, context),
    "````",
    "",
  ];

  if (actionable.length === 0) {
    lines.push("_No open actionable findings._", "");
    return lines.join("\n");
  }

  lines.push("## Per-finding prompts", "");
  for (const f of actionable) {
    lines.push(`### [${f.severity.toUpperCase()}] ${f.title}`, "", `Finding ID: \`${f.id}\``, "");
    lines.push(...formatRemediationMarkdown(f));
    lines.push(...formatAgentPromptMarkdown(f, context));
  }

  return lines.join("\n");
}

export function enrichFindingWithAgentPrompt(
  finding: Finding,
  context: FixGuidanceContext = {},
): Finding & { agentPrompt: string; fixSteps: string[] } {
  return {
    ...finding,
    fixSteps: getFixSteps(finding),
    agentPrompt: buildFindingAgentPrompt(finding, context),
  };
}
