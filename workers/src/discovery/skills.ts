export type SkillArtifact = {
  name: string;
  description: string;
  /** Path under the origin, beginning with /. */
  path: string;
  body: string;
};

const SCAN_SKILL = `---
name: cf-ready-scan
description: Run Cloudflare go-live readiness checks for migration, security, AI, SEO, and deployment.
---

# CF Ready scan

Use this skill when a user wants to know whether a website or app is ready to launch on Cloudflare.

## Install

\`\`\`bash
npx @orangecloud/cf-ready scan
\`\`\`

Node.js 18 or newer is required. A global install also works: \`npm i -g @orangecloud/cf-ready\`.

## What to run

1. \`cf-ready scan\` for the full readiness report.
2. \`cf-ready security-scan\` when the question is about headers, secrets, or dependencies.
3. \`cf-ready ai-ready\` for robots.txt, llms.txt, OpenAPI, and MCP discovery.
4. \`cf-ready seo-ready\` for metadata, canonical URLs, and crawlability.
5. \`cf-ready deploy-check\` before a Workers or Pages deploy.

Read the human docs at /docs/getting-started.html before changing a production config.
`;

const WEB_AGENT_SKILL = `---
name: cf-ready-web-agent
description: Scan a repository for Cloudflare go-live readiness from the browser Web Agent.
---

# CF Ready Web Agent

Use this skill when a user wants to scan a project without installing the CLI.

## Open the agent

The Web Agent is at /app/. It accepts a ZIP upload or a public GitHub repository URL.

## Commands the agent can run

- \`scan\` — full readiness scan
- \`inspect\` — detect the framework
- \`security-scan\` — security findings
- \`ai-ready\` — AI readiness assets
- \`seo-ready\` — SEO checks
- \`deploy-check\` — deployment readiness
- \`migration-plan\` — migration notes
- \`ai-optimize\` — refactor suggestions

Sign-in with GitHub or Google is required only when the deployment enforces authentication. Public read endpoints such as /api/health stay open.
`;

export const SKILL_ARTIFACTS: readonly SkillArtifact[] = [
  {
    name: "cf-ready-scan",
    description:
      "Run Cloudflare go-live readiness checks for migration, security, AI, SEO, and deployment.",
    path: "/.well-known/agent-skills/cf-ready-scan/SKILL.md",
    body: SCAN_SKILL,
  },
  {
    name: "cf-ready-web-agent",
    description: "Scan a repository for Cloudflare go-live readiness from the browser Web Agent.",
    path: "/.well-known/agent-skills/cf-ready-web-agent/SKILL.md",
    body: WEB_AGENT_SKILL,
  },
];

export function skillByPath(pathname: string): SkillArtifact | undefined {
  return SKILL_ARTIFACTS.find((skill) => skill.path === pathname);
}

export async function sha256Prefixed(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}
