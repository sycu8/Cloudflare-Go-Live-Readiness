import { createFinding } from "../../core/findings.js";
import type { Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";

export function analyzeVite(inspection: RepositoryInspection): Finding[] {
  return [
    createFinding({
      category: "migration",
      severity: "info",
      title: "Vite project — Workers with static assets recommended",
      description:
        "Vite SPAs deploy well to Workers with static assets. Pages is still supported.",
      recommendation:
        "Start new projects with Workers. Use Workers static assets for static builds and edge-hosted SPAs, and set the Wrangler assets directory. Pages is still supported.",
      autoFixAvailable: false,
      requiresApproval: false,
    }),
    createFinding({
      category: "migration",
      severity: "info",
      title: "Suggested deployment target",
      description: `Current target: ${inspection.deploymentTarget}. Recommended: Workers with static assets.`,
      recommendation:
        "Add a Wrangler config with an assets directory. Start new projects with Workers. Pages is still supported.",
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
      title: "React SPA — Workers with static assets recommended",
      description:
        "Static React builds can be deployed with Workers static assets. Pages is still supported.",
      recommendation:
        "Build with npm run build and deploy dist/ with Workers static assets. Start new projects with Workers. Pages is still supported.",
      autoFixAvailable: false,
      requiresApproval: false,
    }),
  ];
}
