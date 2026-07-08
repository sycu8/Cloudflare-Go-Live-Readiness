import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { createScanContext } from "../../src/core/context.js";
import { serializeScanContext } from "../../src/service/run-scan.js";
import {
  generatePdfReport,
  pdfReportInputFromScanData,
} from "../../src/generators/pdf-report.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("pdfReportInputFromScanData", () => {
  it("builds PDF input from CLI scan JSON shape", async () => {
    const context = await createScanContext({
      rootDir: path.join(fixtures, "nextjs-app"),
    });
    const scanData = serializeScanContext(context);
    const input = pdfReportInputFromScanData(scanData);

    expect(input).not.toBeNull();
    expect(input!.scores.overall).toBe(context.scores.overall);
    expect(input!.blockers.length).toBeGreaterThan(0);
    expect(input!.blockers[0].title).toBeTruthy();

    const pdf = await generatePdfReport(input!);
    expect(pdf.byteLength).toBeGreaterThan(500);
  });

  it("derives blockers from findings when blockers are id strings", () => {
    const jsonReport = JSON.parse(
      readFileSync(path.join(fixtures, "nextjs-app/cf-ready-report.json"), "utf8"),
    ) as {
      findings: Array<{
        id: string;
        severity: string;
        title: string;
        description: string;
        recommendation: string;
        status: string;
      }>;
      blockers: string[];
      scores: {
        overall: number;
        migration: number;
        security: number;
        aiReadiness: number;
        seo: number;
        deployment: number;
      };
      inspection: {
        projectName: string;
        framework: string;
        packageManager: string;
        deploymentTarget: string;
      };
      productionReady: boolean;
      scannedAt: string;
    };

    const input = pdfReportInputFromScanData({
      productionReady: jsonReport.productionReady,
      scores: jsonReport.scores,
      blockers: jsonReport.blockers as unknown as Array<{ title: string; description: string }>,
      findings: jsonReport.findings,
      inspection: jsonReport.inspection,
      scannedAt: jsonReport.scannedAt,
    });

    expect(input).not.toBeNull();
    expect(input!.blockers.length).toBeGreaterThan(0);
    expect(input!.blockers[0].title).toMatch(/blocker/i);
  });
});
