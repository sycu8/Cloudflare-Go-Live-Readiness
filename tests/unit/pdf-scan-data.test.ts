import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
    const jsonReport = {
      productionReady: false,
      scannedAt: "2026-07-08T00:00:00.000Z",
      scores: {
        overall: 42,
        migration: 0,
        security: 85,
        aiReadiness: 45,
        seo: 25,
        deployment: 90,
      },
      inspection: {
        projectName: "Next.js Fixture App",
        framework: "nextjs",
        packageManager: "npm",
        deploymentTarget: "unknown",
      },
      findings: [
        {
          id: "migration-1",
          status: "open",
          severity: "blocker",
          title: "Runtime blocker: fs",
          description: "Detected fs usage incompatible with Cloudflare Workers runtime.",
          recommendation: "Refactor to use Workers-compatible APIs.",
        },
      ],
      blockers: ["migration-1"],
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
