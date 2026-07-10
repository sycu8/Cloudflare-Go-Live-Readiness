import path from "node:path";
import { RUNTIME_BLOCKER_PATTERNS } from "../../config/default-rules.js";
import { readTextFile } from "../../core/filesystem.js";
import { createFinding, createPassedFinding } from "../../core/findings.js";
import { relativeToRoot } from "../../utils/path.js";
import { projectGlob } from "../../utils/glob.js";
import {
  findLineMatch,
  summarizeEvidence,
  type EvidenceItem,
} from "../../core/evidence.js";
import { getRemediationForRule } from "../../config/remediation-templates.js";
import type { Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";

const MAX_FILES = 500;

export async function scanRuntimeBlockers(
  inspection: RepositoryInspection,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const files = await projectGlob(["**/*.{ts,tsx,js,jsx,mjs,cjs}"], {
    cwd: inspection.rootDir,
    onlyFiles: true,
  });

  const toScan = files.slice(0, MAX_FILES);
  const hits = new Map<string, EvidenceItem[]>();

  for (const file of toScan) {
    const content = await readTextFile(path.join(inspection.rootDir, file));
    if (!content) continue;
    const rel = relativeToRoot(inspection.rootDir, path.join(inspection.rootDir, file));

    const nativeMatch = findLineMatch(
      content,
      /require\s*\(\s*['"][^'"]+\.node['"]\s*\)|from\s+['"][^'"]+\.node['"]/,
    );
    if (nativeMatch) {
      if (!hits.has("native-module")) hits.set("native-module", []);
      hits.get("native-module")!.push({
        file: rel,
        line: nativeMatch.line,
        column: nativeMatch.column,
        snippet: nativeMatch.snippet,
        ruleId: "native-module",
      });
    }

    for (const rule of RUNTIME_BLOCKER_PATTERNS) {
      for (const pattern of rule.patterns) {
        const match = findLineMatch(content, pattern);
        if (!match) continue;
        if (!hits.has(rule.id)) hits.set(rule.id, []);
        hits.get(rule.id)!.push({
          file: rel,
          line: match.line,
          column: match.column,
          snippet: match.snippet,
          ruleId: rule.id,
        });
        break;
      }
    }
  }

  for (const [id, evidenceItems] of hits) {
    const rule = RUNTIME_BLOCKER_PATTERNS.find((r) => r.id === id) ?? {
      id: "native-module",
      module: "native module",
      severity: "blocker" as const,
      patterns: [],
    };
    const affected = [...new Set(evidenceItems.map((e) => e.file))];
    const remediation = getRemediationForRule(id, inspection.framework);
    const recommendation =
      id === "process-env"
        ? "Document required environment variables in wrangler.toml / Cloudflare dashboard. Use env bindings instead of direct filesystem access."
        : `Refactor to use Workers-compatible APIs. Consider Durable Objects, R2, KV, or external services instead of ${rule.module}.`;

    findings.push(
      createFinding({
        id: `migration-${id}`,
        category: "migration",
        severity: id === "native-module" ? "blocker" : rule.severity,
        title: `Runtime blocker: ${rule.module}`,
        description: `Detected ${rule.module} usage incompatible with Cloudflare Workers runtime.`,
        evidence: summarizeEvidence(evidenceItems),
        evidenceItems: evidenceItems.slice(0, 10),
        confidence: "high",
        affectedFiles: affected.slice(0, 10),
        recommendation,
        remediation,
        autoFixAvailable: false,
        requiresApproval: true,
      }),
    );
  }

  if (hits.size === 0) {
    findings.push(
      createPassedFinding(
        "migration",
        "No runtime blockers detected",
        "No obvious Node.js runtime blockers found in scanned source files.",
      ),
    );
  }

  if (inspection.sourceScanTruncated) {
    findings.push(
      createFinding({
        category: "migration",
        severity: "info",
        title: "Source scan truncated",
        description: `Only the first ${MAX_FILES} source files were scanned for runtime blockers.`,
        recommendation: "Review remaining files manually or narrow scan scope.",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  return findings;
}
