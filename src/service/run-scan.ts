import type { ScanContext } from "../core/context.js";
import { createScanContext } from "../core/context.js";
import { writeAllReports } from "../core/report.js";
import { getExitCode } from "../cli/options.js";
import { enrichFindingWithAgentPrompt } from "../generators/fix-guidance.js";
import type { ScanResult, ServiceOptions } from "./types.js";

export function serializeScanContext(context: ScanContext, reports?: string[]): ScanResult["data"] {
  const guideCtx = {
    projectName: context.config.projectName ?? context.inspection.projectName,
    framework: context.inspection.framework,
    deploymentTarget: context.inspection.deploymentTarget,
    packageManager: context.inspection.packageManager,
  };

  return {
    productionReady: context.productionReady,
    scores: context.scores,
    blockers: context.blockers.map((b) => enrichFindingWithAgentPrompt(b, guideCtx)),
    findings: context.findings.map((f) => enrichFindingWithAgentPrompt(f, guideCtx)),
    inspection: context.inspection,
    scannedAt: context.scannedAt,
    reports,
  };
}

export async function runScan(options: ServiceOptions): Promise<ScanResult> {
  const context = await createScanContext({
    rootDir: options.rootDir,
    configPath: options.configPath,
    modules: options.modules,
  });
  const reportNames = options.skipReports
    ? []
    : (await writeAllReports(context)).map((r) => r.name);

  return {
    context,
    exitCode: getExitCode(context.productionReady, false),
    data: serializeScanContext(context, reportNames),
  };
}
