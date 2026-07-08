import { createFinding } from "../../core/findings.js";
import type { Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";

export function analyzeVite(inspection: RepositoryInspection): Finding[] {
  return [
    createFinding({
      category: "migration",
      severity: "info",
      title: "Vite project — Cloudflare Pages recommended",
      description: "Vite SPAs deploy well to Cloudflare Pages or Workers Assets.",
      recommendation:
        "Use Cloudflare Pages for static builds, or Workers Assets for edge-hosted SPAs. Configure wrangler.toml with assets binding.",
      autoFixAvailable: false,
      requiresApproval: false,
    }),
    createFinding({
      category: "migration",
      severity: "info",
      title: "Suggested deployment target",
      description: `Current target: ${inspection.deploymentTarget}. Recommended: cloudflare-pages.`,
      recommendation: "Add wrangler.toml or connect repository to Cloudflare Pages dashboard.",
      autoFixAvailable: false,
      requiresApproval: false,
    }),
  ];
}

export function analyzeReactSpa(_inspection: RepositoryInspection): Finding[] {
  return [
    createFinding({
      category: "migration",
      severity: "info",
      title: "React SPA — Cloudflare Pages recommended",
      description: "Static React builds can be deployed to Cloudflare Pages.",
      recommendation: "Build with npm run build and deploy dist/ to Cloudflare Pages.",
      autoFixAvailable: false,
      requiresApproval: false,
    }),
  ];
}
