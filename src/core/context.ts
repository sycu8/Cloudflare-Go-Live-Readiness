import path from "node:path";
import type { CfReadyConfig } from "../config/schema.js";
import type { Finding } from "../config/schema.js";
import type { RepositoryInspection } from "../inspectors/types.js";
import type { ReadinessScores } from "./scoring.js";
import { inspectRepository, loadConfig } from "../inspectors/repository.js";
import { dedupeFindings, resetFindingCounter } from "./findings.js";
import { calculateScores, isProductionReady } from "./scoring.js";
import { validateProjectRoot } from "./validate.js";
import { runMigrationChecks } from "../modules/migration/index.js";
import { runSecurityChecks } from "../modules/security/index.js";
import { runAiReadinessChecks } from "../modules/ai-readiness/index.js";
import { runSeoChecks } from "../modules/seo/index.js";
import { runDeploymentChecks } from "../modules/deployment/index.js";

export type ScanContext = {
  rootDir: string;
  config: CfReadyConfig;
  inspection: RepositoryInspection;
  findings: Finding[];
  scores: ReadinessScores;
  productionReady: boolean;
  blockers: Finding[];
  scannedAt: string;
};

export type ScanOptions = {
  rootDir: string;
  configPath?: string;
  modules?: Array<"migration" | "security" | "ai-readiness" | "seo" | "deployment">;
};

export async function createScanContext(options: ScanOptions): Promise<ScanContext> {
  const rootDir = await validateProjectRoot(options.rootDir);
  resetFindingCounter();

  const config = await loadConfig(rootDir, options.configPath);
  const inspection = await inspectRepository(rootDir);

  if (config.framework) {
    inspection.framework = config.framework;
  }

  const modules = options.modules ?? [
    "migration",
    "security",
    "ai-readiness",
    "seo",
    "deployment",
  ];

  const allFindings: Finding[] = [];

  if (modules.includes("migration")) {
    allFindings.push(...(await runMigrationChecks(inspection, config)));
  }
  if (modules.includes("security")) {
    allFindings.push(...(await runSecurityChecks(inspection, config)));
  }
  if (modules.includes("ai-readiness")) {
    allFindings.push(...(await runAiReadinessChecks(inspection, config)));
  }
  if (modules.includes("seo")) {
    allFindings.push(...(await runSeoChecks(inspection, config)));
  }
  if (modules.includes("deployment")) {
    allFindings.push(...(await runDeploymentChecks(inspection, config)));
  }

  const findings = dedupeFindings(allFindings);
  const scores = calculateScores(findings);
  const blockers = findings.filter((f) => f.severity === "blocker" && f.status === "open");
  const productionReady = isProductionReady(
    findings,
    config.security?.blockOnSecrets ?? true,
    config.security?.blockOnCriticalDependencies ?? true,
  );

  return {
    rootDir,
    config,
    inspection,
    findings,
    scores,
    productionReady,
    blockers,
    scannedAt: new Date().toISOString(),
  };
}

export function getOutputDir(context: ScanContext): string {
  return path.resolve(context.rootDir, context.config.outputDir ?? ".");
}
