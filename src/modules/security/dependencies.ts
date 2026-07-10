import { execa } from "execa";
import { createFinding, createPassedFinding } from "../../core/findings.js";
import { summarizeEvidence } from "../../core/evidence.js";
import type { CfReadyConfig, Finding, PackageManager } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";

type AuditVulnerability = {
  name?: string;
  severity?: string;
  via?: Array<string | { source?: number; name?: string; title?: string }>;
  fixAvailable?: boolean | { name?: string; version?: string };
  range?: string;
};

type NpmAuditJson = {
  metadata?: { vulnerabilities?: { critical?: number; high?: number } };
  vulnerabilities?: Record<string, AuditVulnerability>;
};

function parseAdvisoryId(via: AuditVulnerability["via"]): string | undefined {
  if (!via?.length) return undefined;
  const first = via[0];
  if (typeof first === "string") return first;
  return first?.name ?? first?.title;
}

export async function checkDependencies(
  inspection: RepositoryInspection,
  config: CfReadyConfig,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const pm = inspection.packageManager;

  const auditCommands: Record<PackageManager, string[]> = {
    npm: ["npm", "audit", "--json"],
    pnpm: ["pnpm", "audit", "--json"],
    yarn: ["yarn", "npm", "audit", "--json"],
    bun: ["bun", "pm", "audit"],
  };

  const cmd = auditCommands[pm];
  if (!cmd) {
    findings.push(
      createFinding({
        category: "security",
        severity: "info",
        title: "Dependency audit not available",
        description: `No audit command configured for ${pm}.`,
        recommendation: "Run dependency audit manually before go-live.",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
    return findings;
  }

  try {
    const result = await execa(cmd[0]!, cmd.slice(1), {
      cwd: inspection.rootDir,
      reject: false,
      timeout: 60000,
    });

    if (result.exitCode !== 0 && !result.stdout) {
      findings.push(
        createFinding({
          category: "security",
          severity: "info",
          title: "Dependency audit command failed",
          description: `Could not run ${cmd.join(" ")}.`,
          evidence: result.stderr?.slice(0, 200),
          recommendation: "Run audit manually: npm audit / pnpm audit",
          autoFixAvailable: false,
          requiresApproval: false,
        }),
      );
      return findings;
    }

    const output = result.stdout || "{}";
    let parsed: NpmAuditJson;
    try {
      parsed = JSON.parse(output) as NpmAuditJson;
    } catch {
      findings.push(
        createPassedFinding(
          "security",
          "Dependency audit command available",
          `Audit ran via ${cmd.join(" ")}. Review output manually.`,
        ),
      );
      return findings;
    }

    const vulns = parsed.vulnerabilities ?? {};
    const entries = Object.entries(vulns).filter(([, v]) => {
      const sev = (v.severity ?? "").toLowerCase();
      return sev === "critical" || sev === "high" || sev === "moderate";
    });

    if (entries.length === 0) {
      findings.push(
        createPassedFinding(
          "security",
          "No critical dependency vulnerabilities",
          "Package audit reported no critical or high vulnerabilities.",
        ),
      );
      return findings;
    }

    for (const [pkg, vuln] of entries.slice(0, 20)) {
      const severity = (vuln.severity ?? "moderate").toLowerCase();
      const mappedSeverity =
        severity === "critical"
          ? config.security?.blockOnCriticalDependencies
            ? "high"
            : "medium"
          : severity === "high"
            ? "high"
            : "medium";
      const advisory = parseAdvisoryId(vuln.via);
      const fixVersion =
        typeof vuln.fixAvailable === "object" ? vuln.fixAvailable.version : undefined;
      const evidenceItems = [
        {
          file: "package.json",
          snippet: `${pkg}@${vuln.range ?? "?"} — ${advisory ?? "advisory"}`,
          ruleId: advisory,
        },
      ];

      findings.push(
        createFinding({
          id: `security-dep-${pkg}-${advisory ?? "vuln"}`,
          category: "security",
          severity: mappedSeverity,
          title: `Vulnerable dependency: ${pkg}`,
          description: `${severity} severity vulnerability in ${pkg}.`,
          evidence: summarizeEvidence(evidenceItems),
          evidenceItems,
          confidence: "high",
          affectedFiles: ["package.json"],
          recommendation: fixVersion
            ? `Upgrade ${pkg} to ${fixVersion} or run ${pm} audit fix.`
            : `Run ${pm} audit fix or update ${pkg} before go-live.`,
          remediation: {
            steps: [
              `Run ${pm} audit fix`,
              fixVersion ? `Or pin ${pkg}@${fixVersion} in package.json` : "Review advisory and upgrade manually",
            ],
            estimatedEffort: "minutes",
          },
          autoFixAvailable: false,
          requiresApproval: true,
        }),
      );
    }
  } catch {
    findings.push(
      createFinding({
        category: "security",
        severity: "info",
        title: "Dependency audit skipped",
        description: "Audit command could not be executed in this environment.",
        recommendation: "Run dependency audit in CI before production deployment.",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  return findings;
}
