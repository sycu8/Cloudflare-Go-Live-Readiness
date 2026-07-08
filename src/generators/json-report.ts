import type { ScanContext } from "../core/context.js";

export function generateJsonReport(context: ScanContext): string {
  return JSON.stringify(
    {
      version: "0.1.0",
      scannedAt: context.scannedAt,
      projectName: context.config.projectName ?? context.inspection.projectName,
      framework: context.inspection.framework,
      packageManager: context.inspection.packageManager,
      deploymentTarget: context.inspection.deploymentTarget,
      productionReady: context.productionReady,
      scores: context.scores,
      inspection: {
        routes: context.inspection.routes,
        apiRoutes: context.inspection.apiRoutes,
        importantFiles: context.inspection.importantFiles,
        hasWranglerConfig: context.inspection.hasWranglerConfig,
        nextJs: context.inspection.nextJs,
      },
      findings: context.findings,
      blockers: context.blockers.map((b) => b.id),
    },
    null,
    2,
  );
}
