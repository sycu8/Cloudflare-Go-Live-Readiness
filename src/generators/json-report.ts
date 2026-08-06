import type { ScanContext } from "../core/context.js";
import {
  buildReportAgentPrompt,
  enrichFindingWithAgentPrompt,
  type FixGuidanceContext,
} from "./fix-guidance.js";

export function generateJsonReport(context: ScanContext): string {
  const guideCtx: FixGuidanceContext = {
    projectName: context.config.projectName ?? context.inspection.projectName,
    framework: context.inspection.framework,
    deploymentTarget: context.inspection.deploymentTarget,
    packageManager: context.inspection.packageManager,
  };

  const actionable = context.findings.filter(
    (f) => f.status === "open" && f.severity !== "passed" && f.severity !== "info",
  );

  return JSON.stringify(
    {
      version: "0.3.1",
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
        sourceScanTruncated: context.inspection.sourceScanTruncated,
      },
      findings: context.findings.map((f) => enrichFindingWithAgentPrompt(f, guideCtx)),
      blockers: context.blockers.map((b) => b.id),
      aiFixPrompts: {
        batch: buildReportAgentPrompt(actionable, guideCtx),
        perFinding: actionable.map((f) => ({
          id: f.id,
          title: f.title,
          severity: f.severity,
          prompt: enrichFindingWithAgentPrompt(f, guideCtx).agentPrompt,
        })),
      },
    },
    null,
    2,
  );
}
