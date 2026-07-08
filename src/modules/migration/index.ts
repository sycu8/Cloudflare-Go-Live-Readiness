import type { CfReadyConfig, Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";
import { analyzeNextJs } from "./nextjs.js";
import { analyzeVite, analyzeReactSpa } from "./vite.js";
import { analyzeNode } from "./node.js";
import { analyzeLegacy } from "./legacy.js";
import { scanRuntimeBlockers } from "./blockers.js";

export async function runMigrationChecks(
  inspection: RepositoryInspection,
  config: CfReadyConfig,
): Promise<Finding[]> {
  const findings: Finding[] = [];

  findings.push(...(await scanRuntimeBlockers(inspection)));

  switch (inspection.framework) {
    case "nextjs":
      findings.push(...(await analyzeNextJs(inspection, config)));
      break;
    case "vite":
      findings.push(...analyzeVite(inspection));
      break;
    case "react-spa":
      findings.push(...analyzeReactSpa(inspection));
      break;
    case "express":
    case "nodejs":
      findings.push(...analyzeNode(inspection));
      break;
    case "astro":
    case "remix":
    case "nuxt":
      findings.push({
        id: `migration-${inspection.framework}`,
        category: "migration",
        severity: "info",
        title: `${inspection.framework} detected`,
        description: `Review ${inspection.framework} Cloudflare adapter documentation.`,
        recommendation: `Check official ${inspection.framework} Cloudflare deployment guide and wrangler configuration.`,
        autoFixAvailable: false,
        requiresApproval: false,
        status: "open",
      });
      break;
    case "unknown":
      findings.push(...analyzeLegacy());
      break;
    case "static":
      break;
    default:
      break;
  }

  if (inspection.deploymentTarget === "vercel" || inspection.deploymentTarget === "netlify") {
    findings.push({
      id: "migration-current-hosting",
      category: "migration",
      severity: "info",
      title: `Currently configured for ${inspection.deploymentTarget}`,
      description: "Migration to Cloudflare requires config and build changes.",
      recommendation: "Update deployment config, environment variables, and CI workflows for Cloudflare.",
      autoFixAvailable: false,
      requiresApproval: false,
      status: "open",
    });
  }

  return findings;
}

export function generateMigrationPlanMarkdown(
  inspection: RepositoryInspection,
  findings: Finding[],
): string {
  const migrationFindings = findings.filter((f) => f.category === "migration");
  const lines = [
    "# Cloudflare Migration Plan",
    "",
    `**Project:** ${inspection.projectName}`,
    `**Framework:** ${inspection.framework}`,
    `**Current deployment:** ${inspection.deploymentTarget}`,
  ];

  if (inspection.nextJs) {
    lines.push(`**Next.js router:** ${inspection.nextJs.router}`);
  }

  lines.push("", "## Recommended steps", "");

  if (inspection.framework === "nextjs") {
    lines.push("### Next.js → Cloudflare Workers (vinext)", "", "```bash");
    lines.push("npx vinext check");
    lines.push("npx vinext init --platform=cloudflare");
    lines.push("npm run build:vinext");
    lines.push("npx @vinext/cloudflare deploy --dry-run");
    lines.push("```", "");
    lines.push("> cf-ready does **not** run these commands automatically.", "");
  }

  if (inspection.framework === "vite" || inspection.framework === "react-spa") {
    lines.push("### Vite/React → Cloudflare Pages", "", "- Build: `npm run build`", "- Deploy `dist/` to Cloudflare Pages", "- Or configure Workers Assets in wrangler.toml", "");
  }

  if (inspection.framework === "express" || inspection.framework === "nodejs") {
    lines.push("### Node.js → Progressive migration", "", "1. Put Cloudflare in front (DNS, CDN, WAF)", "2. Refactor APIs to Hono on Workers", "3. Migrate stateful logic to Durable Objects / external DB", "");
  }

  lines.push("## Findings", "");
  for (const f of migrationFindings) {
    lines.push(`### [${f.severity.toUpperCase()}] ${f.title}`, "", f.description, "", `**Recommendation:** ${f.recommendation}`, "");
  }

  return lines.join("\n");
}
