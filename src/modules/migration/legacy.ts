import { createFinding } from "../../core/findings.js";
import type { Finding } from "../../config/schema.js";

export function analyzeLegacy(): Finding[] {
  const recommendations = [
    "Place Cloudflare in front: DNS, CDN, WAF",
    "Configure cache rules for static assets",
    "Add Turnstile for bot protection",
    "Use Zero Trust for admin routes if applicable",
    "Plan progressive replatforming after inspection",
  ];

  return [
    createFinding({
      category: "migration",
      severity: "medium",
      title: "Legacy or unknown stack detected",
      description: "Framework could not be confidently identified.",
      recommendation: recommendations.join("\n"),
      autoFixAvailable: false,
      requiresApproval: true,
    }),
    createFinding({
      category: "migration",
      severity: "info",
      title: "Cloudflare in front first",
      description: "Start with reverse proxy benefits before replatforming.",
      evidence: recommendations.join("\n"),
      recommendation:
        "Enable Cloudflare proxy on DNS, configure WAF rules, then reassess migration path.",
      autoFixAvailable: false,
      requiresApproval: false,
    }),
  ];
}
