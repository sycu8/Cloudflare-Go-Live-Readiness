#!/usr/bin/env node
/**
 * Generate a large sanitized scan result for UI/QA scale testing.
 * No real project data — synthetic findings only.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "scan-result-large.json");

const severities = ["blocker", "high", "medium", "low", "info"];
const categories = ["migration", "security", "ai-readiness", "seo", "deployment"];

const findings = Array.from({ length: 55 }, (_, i) => {
  const severity = severities[i % severities.length];
  const category = categories[i % categories.length];
  return {
    id: `qa-finding-${i + 1}`,
    status: severity === "info" ? "passed" : "open",
    category,
    severity,
    title: `QA synthetic finding #${i + 1}`,
    description: `Sanitized description for ${category} check ${i + 1}.`,
    recommendation: `Remediation step ${i + 1}.`,
  };
});

const blockers = findings.filter((f) => f.severity === "blocker").map((f) => f.id);

const payload = {
  version: "0.1.0",
  scannedAt: "2026-07-08T12:00:00.000Z",
  projectName: "QA Scale Fixture",
  framework: "nextjs",
  productionReady: false,
  scores: {
    overall: 48,
    migration: 12,
    security: 72,
    aiReadiness: 41,
    seo: 35,
    deployment: 88,
  },
  inspection: {
    projectName: "QA Scale Fixture",
    framework: "nextjs",
    packageManager: "npm",
    deploymentTarget: "workers",
  },
  findings,
  blockers,
};

writeFileSync(out, JSON.stringify(payload, null, 2));
console.log(`Wrote ${out} (${findings.length} findings)`);
