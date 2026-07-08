import { execa } from "execa";
import { createFinding, createPassedFinding } from "../../core/findings.js";
import type { CfReadyConfig, Finding, PackageManager } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";

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
    let critical = 0;
    let high = 0;

    try {
      const parsed = JSON.parse(output) as {
        metadata?: { vulnerabilities?: { critical?: number; high?: number } };
      };
      critical = parsed.metadata?.vulnerabilities?.critical ?? 0;
      high = parsed.metadata?.vulnerabilities?.high ?? 0;
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

    if (critical > 0 || high > 0) {
      const severity = critical > 0 && config.security?.blockOnCriticalDependencies ? "high" : "medium";
      findings.push(
        createFinding({
          id: critical > 0 ? "security-critical-dependencies" : "security-high-dependencies",
          category: "security",
          severity,
          title: `Dependency vulnerabilities: ${critical} critical, ${high} high`,
          description: "Package audit found vulnerabilities.",
          recommendation: "Run npm audit fix or update vulnerable packages before go-live.",
          autoFixAvailable: false,
          requiresApproval: true,
        }),
      );
    } else {
      findings.push(
        createPassedFinding(
          "security",
          "No critical dependency vulnerabilities",
          "Package audit reported no critical or high vulnerabilities.",
        ),
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
