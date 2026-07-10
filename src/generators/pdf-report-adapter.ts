import type { ScanContext } from "../core/context.js";
import type { PdfReportInput } from "../generators/pdf-report.js";

export function pdfReportInputFromContext(context: ScanContext): PdfReportInput {
  const openFindings = context.findings
    .filter((f) => f.status === "open" && f.severity !== "passed")
    .slice(0, 40);

  return {
    projectName: context.config.projectName ?? context.inspection.projectName,
    framework: context.inspection.framework,
    packageManager: context.inspection.packageManager,
    deploymentTarget: context.inspection.deploymentTarget,
    scannedAt: context.scannedAt,
    productionReady: context.productionReady,
    scores: {
      overall: context.scores.overall,
      migration: context.scores.migration,
      security: context.scores.security,
      aiReadiness: context.scores.aiReadiness,
      seo: context.scores.seo,
      deployment: context.scores.deployment,
    },
    blockers: context.blockers.map((b) => ({ title: b.title, description: b.description })),
    findings: openFindings.map((f) => ({
      severity: f.severity,
      title: f.title,
      description: f.description,
      recommendation: f.recommendation,
      evidence: f.evidence,
      remediationSteps: f.remediation?.steps,
    })),
  };
}
