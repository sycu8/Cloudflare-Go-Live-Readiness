import { createFinding } from "../../core/findings.js";
import type { CfReadyConfig, Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";

export async function analyzeNextJs(
  inspection: RepositoryInspection,
  config: CfReadyConfig,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const next = inspection.nextJs;

  if (!next) return findings;

  findings.push(
    createFinding({
      category: "migration",
      severity: "info",
      title: `Next.js ${next.router === "app" ? "App Router" : next.router === "pages" ? "Pages Router" : "router"} detected`,
      description: `Next.js project uses ${next.router} routing.`,
      recommendation: "Evaluate vinext for Cloudflare Workers deployment.",
      autoFixAvailable: false,
      requiresApproval: false,
    }),
  );

  if (next.hasMiddleware) {
    findings.push(
      createFinding({
        category: "migration",
        severity: "medium",
        title: "Next.js middleware detected",
        description: "Middleware may have edge runtime constraints on Cloudflare.",
        recommendation: "Review middleware for Node.js APIs and test with vinext check.",
        autoFixAvailable: false,
        requiresApproval: true,
      }),
    );
  }

  const preferredPath = config.migration?.preferredPath ?? "vinext";
  const fallbackPath = config.migration?.fallbackPath ?? "opennext";

  const risky =
    next.hasMiddleware ||
    findings.some((f) => f.severity === "blocker") ||
    inspection.apiRoutes.length > 5;

  const commands = [
    "npx vinext check",
    "npx vinext init --platform=cloudflare",
    "npm run build:vinext",
    "npx @vinext/cloudflare deploy --dry-run",
  ];

  if (preferredPath === "vinext") {
    findings.push(
      createFinding({
        id: "migration-vinext-recommended",
        category: "migration",
        severity: risky ? "medium" : "info",
        title: risky
          ? "vinext may be risky — consider OpenNext fallback"
          : "Recommended migration path: vinext",
        description: risky
          ? `Middleware, API routes, or runtime blockers suggest ${fallbackPath} may be safer than vinext.`
          : "vinext appears suitable for this Next.js project on Cloudflare Workers.",
        evidence: commands.join("\n"),
        recommendation: risky
          ? `Consider ${fallbackPath} as fallback. Run suggested commands manually:\n${commands.join("\n")}`
          : `Run these commands manually (not executed by cf-ready):\n${commands.join("\n")}`,
        autoFixAvailable: false,
        requiresApproval: true,
      }),
    );
  }

  if (next.configFiles.length === 0) {
    findings.push(
      createFinding({
        category: "migration",
        severity: "low",
        title: "No Next.js config file found",
        description: "next.config.js/mjs/ts not detected.",
        recommendation: "Add next.config if you need custom Cloudflare-compatible settings.",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  return findings;
}
