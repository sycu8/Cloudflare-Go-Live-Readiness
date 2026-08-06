import { createFinding } from "../../core/findings.js";
import type { Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";
import { getRemediationForRule } from "../../config/remediation-templates.js";

export function analyzeRemix(inspection: RepositoryInspection): Finding[] {
  const findings: Finding[] = [];
  const remix = inspection.remix;
  const remediation = getRemediationForRule("migration-remix", "remix");

  findings.push(
    createFinding({
      id: "migration-remix-detected",
      category: "migration",
      severity: "info",
      title: remix?.usesVite ? "Remix (Vite) project detected" : "Remix project detected",
      description: remix?.configFiles.length
        ? `Config files: ${remix.configFiles.join(", ")}.`
        : "Remix detected from @remix-run/* dependencies.",
      recommendation:
        "Prefer the official Remix Cloudflare templates (@remix-run/cloudflare) for Workers/Pages.",
      remediation,
      autoFixAvailable: false,
      requiresApproval: false,
      evidenceItems: (remix?.configFiles ?? []).map((file) => ({ file })),
    }),
  );

  if (!remix?.hasCloudflareAdapter) {
    findings.push(
      createFinding({
        id: "migration-remix-adapter-missing",
        category: "migration",
        severity: "medium",
        title: "Remix Cloudflare adapter not detected",
        description:
          "Project appears configured for Node (@remix-run/node) or lacks @remix-run/cloudflare packages.",
        recommendation:
          "Migrate to @remix-run/cloudflare (or Cloudflare Pages template). Review loaders/actions for Node-only APIs.",
        remediation,
        autoFixAvailable: false,
        requiresApproval: true,
      }),
    );
  } else {
    findings.push(
      createFinding({
        id: "migration-remix-adapter-present",
        category: "migration",
        severity: "info",
        title: "Remix Cloudflare adapter detected",
        description: "@remix-run/cloudflare (or related package) is present.",
        recommendation: "Validate wrangler config and session/storage bindings for production.",
        remediation,
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  if (!inspection.hasWranglerConfig) {
    findings.push(
      createFinding({
        id: "migration-remix-wrangler",
        category: "migration",
        severity: "medium",
        title: "Missing wrangler config for Remix on Cloudflare",
        description: "wrangler.toml / wrangler.jsonc not found.",
        recommendation: "Add wrangler configuration matching your Remix Cloudflare template.",
        remediation,
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  if (inspection.hasAuthPatterns) {
    findings.push(
      createFinding({
        id: "migration-remix-auth",
        category: "migration",
        severity: "info",
        title: "Auth patterns detected in Remix app",
        description: "Session or auth libraries may need Workers-compatible storage.",
        recommendation:
          "Use Cloudflare KV, Durable Objects, or external session stores instead of Node filesystem sessions.",
        remediation,
        autoFixAvailable: false,
        requiresApproval: true,
      }),
    );
  }

  return findings;
}
