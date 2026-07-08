import type { AiOptimizeRequest } from "./types.js";

export function buildOptimizePrompt(body: AiOptimizeRequest): string {
  const focus = body.focus ?? "all";
  const findings = body.findings
    .filter((f) => focus === "all" || f.category === focus || (focus === "migration" && f.category === "migration"))
    .slice(0, 15);

  const findingsText = findings
    .map(
      (f) =>
        `- [${f.severity}] ${f.id}: ${f.title}\n  ${f.description}\n  Recommendation: ${f.recommendation}\n  Files: ${f.affectedFiles?.join(", ") ?? "n/a"}`,
    )
    .join("\n\n");

  const snippets = body.fileSnippets
    .slice(0, 8)
    .map((s) => `### ${s.path}\n\`\`\`\n${s.content.slice(0, 2500)}\n\`\`\``)
    .join("\n\n");

  return `You are a senior Cloudflare architect helping migrate and optimize apps for Workers/Pages.

Project context:
- Framework: ${body.framework}
- Deployment target: ${body.deploymentTarget}
- Focus: ${focus}

Readiness findings:
${findingsText || "No findings"}

Relevant code snippets:
${snippets || "No code snippets provided"}

Respond in valid JSON only (no markdown fences) with this shape:
{
  "summary": "2-3 sentence executive summary",
  "suggestions": [
    {
      "findingId": "optional finding id",
      "title": "short title",
      "priority": "blocker|high|medium|low",
      "refactorSteps": ["step 1", "step 2"],
      "cloudflarePattern": "Workers-native pattern to use (R2, KV, Durable Objects, Hono, etc.)",
      "estimatedEffort": "e.g. 1-2 hours"
    }
  ]
}

Rules:
- Prefer Cloudflare Workers/Pages compatible patterns
- Never suggest auto-deploy or destructive git commands
- For fs/child_process blockers, suggest concrete refactors (R2, fetch, queues)
- For Next.js, mention vinext/OpenNext only as options, not automatic migration
- Maximum 8 suggestions, prioritized by severity`;
}

export function extractJsonFromModelResponse(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}
