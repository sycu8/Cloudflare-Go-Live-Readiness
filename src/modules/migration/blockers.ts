import path from "node:path";
import { RUNTIME_BLOCKER_PATTERNS } from "../../config/default-rules.js";
import { readTextFile } from "../../core/filesystem.js";
import { createFinding, createPassedFinding } from "../../core/findings.js";
import { relativeToRoot } from "../../utils/path.js";
import { projectGlob } from "../../utils/glob.js";
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
  const hitFiles = new Map<string, Set<string>>();

  for (const file of toScan) {
    const content = await readTextFile(path.join(inspection.rootDir, file));
    if (!content) continue;

    if (/require\s*\(\s*['"][^'"]+\.node['"]\s*\)/.test(content) || /from\s+['"][^'"]+\.node['"]/.test(content)) {
      const rel = relativeToRoot(inspection.rootDir, path.join(inspection.rootDir, file));
      if (!hitFiles.has("native-module")) hitFiles.set("native-module", new Set());
      hitFiles.get("native-module")!.add(rel);
    }

    for (const rule of RUNTIME_BLOCKER_PATTERNS) {
      for (const pattern of rule.patterns) {
        if (pattern.test(content)) {
          const rel = relativeToRoot(inspection.rootDir, path.join(inspection.rootDir, file));
          if (!hitFiles.has(rule.id)) hitFiles.set(rule.id, new Set());
          hitFiles.get(rule.id)!.add(rel);
          break;
        }
      }
    }
  }

  for (const [id, filesSet] of hitFiles) {
    const rule = RUNTIME_BLOCKER_PATTERNS.find((r) => r.id === id) ?? {
      id: "native-module",
      module: "native module",
      severity: "blocker" as const,
      patterns: [],
    };
    const affected = [...filesSet];
    findings.push(
      createFinding({
        category: "migration",
        severity: id === "native-module" ? "blocker" : rule.severity,
        title: `Runtime blocker: ${rule.module}`,
        description: `Detected ${rule.module} usage incompatible with Cloudflare Workers runtime.`,
        evidence: `Found in ${affected.length} file(s)`,
        affectedFiles: affected.slice(0, 10),
        recommendation:
          id === "process-env"
            ? "Document required environment variables in wrangler.toml / Cloudflare dashboard. Use env bindings instead of direct filesystem access."
            : `Refactor to use Workers-compatible APIs. Consider Durable Objects, R2, KV, or external services instead of ${rule.module}.`,
        autoFixAvailable: false,
        requiresApproval: true,
      }),
    );
  }

  if (hitFiles.size === 0) {
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
