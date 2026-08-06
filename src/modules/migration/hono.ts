import { createFinding } from "../../core/findings.js";
import type { Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";
import { getRemediationForRule } from "../../config/remediation-templates.js";

export function analyzeHono(inspection: RepositoryInspection): Finding[] {
  const findings: Finding[] = [];
  const hono = inspection.hono;
  const remediation = getRemediationForRule("migration-hono", "hono");

  findings.push(
    createFinding({
      id: "migration-hono-detected",
      category: "migration",
      severity: "info",
      title: "Hono app detected",
      description: hono?.entryFiles.length
        ? `Entry files: ${hono.entryFiles.join(", ")}.`
        : "Hono dependency detected.",
      recommendation:
        "Deploy with wrangler as a Cloudflare Worker. Prefer the default export fetch handler pattern.",
      remediation,
      autoFixAvailable: false,
      requiresApproval: false,
      evidenceItems: (hono?.entryFiles ?? []).map((file) => ({ file })),
    }),
  );

  if (hono?.hasNodeServer) {
    findings.push(
      createFinding({
        id: "migration-hono-node-server",
        category: "migration",
        severity: "medium",
        title: "@hono/node-server detected",
        description:
          "Node server adapter is present. Long-running Node servers are not Workers-native.",
        recommendation:
          "Remove @hono/node-server for Cloudflare deploy and export the Hono app as a Worker fetch handler.",
        remediation,
        autoFixAvailable: false,
        requiresApproval: true,
      }),
    );
  }

  if (!inspection.hasWranglerConfig) {
    findings.push(
      createFinding({
        id: "migration-hono-wrangler",
        category: "migration",
        severity: "medium",
        title: "Missing wrangler config for Hono Worker",
        description: "wrangler.toml / wrangler.jsonc not found.",
        recommendation:
          "Add wrangler.toml with main entry pointing at your Hono worker and a compatibility_date.",
        remediation: {
          ...remediation,
          steps: remediation?.steps ?? [
            "Add wrangler.toml with main entry pointing at your Hono worker.",
          ],
          wranglerSnippet:
            'name = "hono-app"\nmain = "src/index.ts"\ncompatibility_date = "2024-01-01"',
        },
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  if (hono?.hasWorkersAdapterHint && inspection.hasWranglerConfig) {
    findings.push(
      createFinding({
        id: "migration-hono-workers-ready",
        category: "migration",
        severity: "info",
        title: "Hono looks Workers-oriented",
        description: "Worker-style export or wrangler dependency detected alongside Hono.",
        recommendation: "Run wrangler deploy --dry-run and verify bindings (KV, D1, R2) as needed.",
        remediation,
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  } else if (!hono?.hasNodeServer) {
    findings.push(
      createFinding({
        id: "migration-hono-target",
        category: "migration",
        severity: "info",
        title: "Suggested target: Cloudflare Workers",
        description: `Current deployment target: ${inspection.deploymentTarget}.`,
        recommendation:
          "Export `app` via `export default app` (or `{ fetch: app.fetch }`) and deploy with wrangler.",
        remediation,
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  return findings;
}
