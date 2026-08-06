import { createFinding } from "../../core/findings.js";
import type { Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";
import { getRemediationForRule } from "../../config/remediation-templates.js";

export function analyzeAstro(inspection: RepositoryInspection): Finding[] {
  const findings: Finding[] = [];
  const astro = inspection.astro;
  const remediation = getRemediationForRule("migration-astro", "astro");

  findings.push(
    createFinding({
      id: "migration-astro-detected",
      category: "migration",
      severity: "info",
      title: `Astro project (${astro?.outputMode ?? "unknown"} output)`,
      description: astro?.configFiles.length
        ? `Astro config: ${astro.configFiles.join(", ")}.`
        : "Astro detected from package dependencies.",
      recommendation:
        "Use @astrojs/cloudflare for SSR/hybrid, or deploy static builds to Cloudflare Pages.",
      remediation,
      autoFixAvailable: false,
      requiresApproval: false,
      evidenceItems: (astro?.configFiles ?? []).map((file) => ({ file })),
    }),
  );

  if (!astro?.hasCloudflareAdapter && (astro?.outputMode === "server" || astro?.outputMode === "hybrid")) {
    findings.push(
      createFinding({
        id: "migration-astro-adapter-missing",
        category: "migration",
        severity: "medium",
        title: "Astro SSR/hybrid without Cloudflare adapter",
        description: `Output mode is ${astro.outputMode} but @astrojs/cloudflare was not detected.`,
        recommendation:
          "Install @astrojs/cloudflare and set adapter: cloudflare() in astro.config. Review Node-only integrations.",
        remediation,
        autoFixAvailable: false,
        requiresApproval: true,
      }),
    );
  }

  if (astro?.hasCloudflareAdapter) {
    findings.push(
      createFinding({
        id: "migration-astro-adapter-present",
        category: "migration",
        severity: "info",
        title: "Cloudflare Astro adapter detected",
        description: "@astrojs/cloudflare (or config reference) is present.",
        recommendation: "Confirm wrangler.toml / Workers Assets settings and run a preview deploy.",
        remediation,
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  if (!astro?.hasCloudflareAdapter && (astro?.outputMode === "static" || astro?.outputMode === "unknown")) {
    findings.push(
      createFinding({
        id: "migration-astro-pages",
        category: "migration",
        severity: "info",
        title: "Suggested target: Cloudflare Pages (static Astro)",
        description: `Current deployment target: ${inspection.deploymentTarget}.`,
        recommendation:
          "Build with `astro build` and deploy `dist/` to Cloudflare Pages, or add the Cloudflare adapter if you need SSR.",
        remediation,
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  if (!inspection.hasWranglerConfig && astro?.hasCloudflareAdapter) {
    findings.push(
      createFinding({
        id: "migration-astro-wrangler",
        category: "migration",
        severity: "medium",
        title: "Missing wrangler config for Astro Cloudflare adapter",
        description: "Adapter is present but wrangler.toml / wrangler.jsonc was not found.",
        recommendation: "Add wrangler configuration for the Astro Cloudflare adapter output.",
        remediation,
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  return findings;
}
