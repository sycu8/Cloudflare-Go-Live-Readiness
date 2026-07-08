import { createFinding } from "../../core/findings.js";
import type { Finding } from "../../config/schema.js";

export function analyzeNode(inspection: { framework: string }): Finding[] {
  const isExpress = inspection.framework === "express";
  return [
    createFinding({
      category: "migration",
      severity: "high",
      title: isExpress ? "Express server detected" : "Node.js server detected",
      description:
        "Long-running Node.js servers are not compatible with Cloudflare Workers without refactoring.",
      recommendation: isExpress
        ? "Consider migrating to Hono on Cloudflare Workers. Start with Cloudflare in front (DNS, CDN, WAF) while refactoring."
        : "Refactor to Workers-native patterns or use Cloudflare Tunnel to existing infrastructure.",
      autoFixAvailable: false,
      requiresApproval: true,
    }),
    createFinding({
      category: "migration",
      severity: "info",
      title: "Suggested refactor path: Hono",
      description: "Hono provides Express-like routing on Cloudflare Workers.",
      recommendation:
        "Evaluate Hono (https://hono.dev) for API routes. Keep Express behind Cloudflare proxy during migration.",
      autoFixAvailable: false,
      requiresApproval: true,
    }),
  ];
}
