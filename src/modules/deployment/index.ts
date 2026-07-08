import path from "node:path";
import { createFinding, createPassedFinding } from "../../core/findings.js";
import { fileExists, readTextFile } from "../../core/filesystem.js";
import { readPackageJson, hasScript } from "../../utils/package-json.js";
import type { CfReadyConfig, Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";

export async function checkScripts(inspection: RepositoryInspection): Promise<Finding[]> {
  const findings: Finding[] = [];
  const pkg = await readPackageJson(inspection.rootDir);

  if (!pkg) {
    findings.push(
      createFinding({
        category: "deployment",
        severity: "medium",
        title: "No package.json found",
        description: "Cannot verify npm scripts without package.json.",
        recommendation: "Add package.json with build, dev, and start scripts.",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
    return findings;
  }

  const requiredScripts = [
    { name: "build", severity: "high" as const },
    { name: "dev", severity: "low" as const },
    { name: "start", severity: "medium" as const },
    { name: "lint", severity: "low" as const },
    { name: "test", severity: "low" as const },
  ];

  for (const { name, severity } of requiredScripts) {
    if (hasScript(pkg, name)) {
      findings.push(
        createPassedFinding("deployment", `${name} script present`, `npm run ${name} is configured.`),
      );
    } else if (name === "build") {
      findings.push(
        createFinding({
          category: "deployment",
          severity,
          title: `Missing ${name} script`,
          description: `package.json has no "${name}" script.`,
          recommendation: `Add "${name}" script to package.json before deployment.`,
          autoFixAvailable: false,
          requiresApproval: false,
        }),
      );
    } else {
      findings.push(
        createFinding({
          category: "deployment",
          severity: "info",
          title: `Missing ${name} script`,
          description: `Optional script "${name}" not found.`,
          recommendation: `Consider adding "${name}" for go-live quality gates.`,
          autoFixAvailable: false,
          requiresApproval: false,
        }),
      );
    }
  }

  const hasTypecheck =
    hasScript(pkg, "typecheck") || hasScript(pkg, "type-check") || hasScript(pkg, "check");
  if (!hasTypecheck) {
    findings.push(
      createFinding({
        category: "deployment",
        severity: "info",
        title: "No typecheck script",
        description: "typecheck script not found in package.json.",
        recommendation: 'Add "typecheck": "tsc --noEmit" for CI quality gates.',
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  return findings;
}

export async function checkCloudflareConfig(inspection: RepositoryInspection): Promise<Finding[]> {
  const findings: Finding[] = [];
  const target = inspection.deploymentTarget;

  if (
    (target === "cloudflare-workers" || target === "cloudflare-pages") &&
    !inspection.hasWranglerConfig
  ) {
    findings.push(
      createFinding({
        category: "deployment",
        severity: "high",
        title: "Missing Cloudflare configuration",
        description: "wrangler.toml or wrangler.jsonc not found.",
        recommendation: "Add wrangler.toml with name, compatibility_date, and build configuration.",
        autoFixAvailable: false,
        requiresApproval: true,
      }),
    );
  } else if (inspection.hasWranglerConfig) {
    findings.push(
      createPassedFinding(
        "deployment",
        "Cloudflare config present",
        "wrangler configuration file detected.",
      ),
    );
  }

  return findings;
}

export async function checkEnvDocs(inspection: RepositoryInspection): Promise<Finding[]> {
  const findings: Finding[] = [];
  const envExample = await fileExists(path.join(inspection.rootDir, ".env.example"));
  const readme = await readTextFile(path.join(inspection.rootDir, "README.md"));
  const documentsEnv = readme?.toLowerCase().includes("environment variable");

  if (!envExample && !documentsEnv) {
    findings.push(
      createFinding({
        category: "deployment",
        severity: "medium",
        title: "Environment variables not documented",
        description: "No .env.example or README env documentation found.",
        recommendation: "Add .env.example listing required variables for Cloudflare deployment.",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  } else {
    findings.push(
      createPassedFinding(
        "deployment",
        "Environment variables documented",
        envExample ? ".env.example present." : "README documents environment variables.",
      ),
    );
  }

  return findings;
}

export function generateRollbackPlan(inspection: RepositoryInspection): string {
  return [
    "# Rollback Plan",
    "",
    `**Project:** ${inspection.projectName}`,
    `**Generated:** ${new Date().toISOString()}`,
    "",
    "## Pre-deployment",
    "",
    "1. Tag current production release in git",
    "2. Export Cloudflare Worker/Pages deployment ID",
    "3. Document current DNS records",
    "4. Snapshot environment variables",
    "",
    "## Rollback steps",
    "",
    "1. Revert to previous Worker version: `wrangler rollback`",
    "2. Or redeploy previous Pages deployment from dashboard",
    "3. Restore DNS if changed",
    "4. Verify smoke test passes on rolled-back version",
    "",
    "## Verification",
    "",
    "- Run `cf-ready smoke-test --url <production-url>`",
    "- Check error rates in Cloudflare analytics",
    "- Confirm critical routes respond 200",
    "",
  ].join("\n");
}

export function generateDeploymentManifest(
  inspection: RepositoryInspection,
  config: CfReadyConfig,
): string {
  return JSON.stringify(
    {
      projectName: config.projectName ?? inspection.projectName,
      framework: inspection.framework,
      packageManager: inspection.packageManager,
      deploymentTarget: config.target ?? inspection.deploymentTarget,
      productionUrl: config.productionUrl ?? null,
      criticalRoutes: config.criticalRoutes,
      cloudflare: {
        hasWranglerConfig: inspection.hasWranglerConfig,
      },
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

export async function runDeploymentChecks(
  inspection: RepositoryInspection,
  config: CfReadyConfig,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  findings.push(...(await checkScripts(inspection)));
  findings.push(...(await checkCloudflareConfig(inspection)));
  findings.push(...(await checkEnvDocs(inspection)));

  const migrationSelected = config.migration?.preferredPath || config.target;
  if (!migrationSelected && inspection.deploymentTarget === "unknown") {
    findings.push(
      createFinding({
        category: "deployment",
        severity: "medium",
        title: "Migration path not selected",
        description: "No target or migration path configured in cf-ready.config.json.",
        recommendation: "Set target and migration.preferredPath in config.",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  return findings;
}
