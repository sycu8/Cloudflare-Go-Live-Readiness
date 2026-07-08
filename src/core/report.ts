import path from "node:path";
import type { ScanContext } from "../core/context.js";
import { writeTextFile, ensureDir, writeBinaryFile } from "../core/filesystem.js";
import { generateMarkdownReport, generateGoLiveChecklist } from "../generators/markdown-report.js";
import { generateJsonReport } from "../generators/json-report.js";
import { generatePdfReport } from "../generators/pdf-report.js";
import { pdfReportInputFromContext } from "../generators/pdf-report-adapter.js";
import { generateSarif } from "../generators/sarif.js";
import { generateMigrationPlanMarkdown } from "../modules/migration/index.js";
import { generateAiReadinessReport } from "../modules/ai-readiness/index.js";
import { generateSeoReadinessReport } from "../modules/seo/index.js";
import {
  generateRollbackPlan,
  generateDeploymentManifest,
} from "../modules/deployment/index.js";
import { getOutputDir } from "../core/context.js";

export type ReportFiles = {
  path: string;
  name: string;
}[];

export async function writeAllReports(context: ScanContext): Promise<ReportFiles> {
  const outputDir = getOutputDir(context);
  await ensureDir(outputDir);

  const reports: Array<{ name: string; content: string }> = [
    { name: "cf-ready-report.md", content: generateMarkdownReport(context) },
    { name: "cf-ready-report.json", content: generateJsonReport(context) },
    {
      name: "migration-plan.md",
      content: generateMigrationPlanMarkdown(context.inspection, context.findings),
    },
    {
      name: "security-findings.sarif",
      content: generateSarif(context.findings, context.rootDir),
    },
    {
      name: "ai-readiness-report.md",
      content: generateAiReadinessReport(context.inspection, context.findings),
    },
    {
      name: "seo-readiness-report.md",
      content: generateSeoReadinessReport(context.inspection, context.findings),
    },
    { name: "go-live-checklist.md", content: generateGoLiveChecklist(context) },
    { name: "rollback-plan.md", content: generateRollbackPlan(context.inspection) },
    {
      name: "deployment-manifest.json",
      content: generateDeploymentManifest(context.inspection, context.config),
    },
  ];

  const written: ReportFiles = [];
  for (const report of reports) {
    const filePath = path.join(outputDir, report.name);
    await writeTextFile(filePath, report.content, { force: true });
    written.push({ path: filePath, name: report.name });
  }

  const pdfBytes = await generatePdfReport(pdfReportInputFromContext(context));
  const pdfPath = path.join(outputDir, "cf-ready-report.pdf");
  await writeBinaryFile(pdfPath, pdfBytes, { force: true });
  written.push({ path: pdfPath, name: "cf-ready-report.pdf" });

  return written;
}
