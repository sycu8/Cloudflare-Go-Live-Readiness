import { describe, it, expect } from "vitest";
import { generatePdfReport, type PdfReportInput } from "../../src/generators/pdf-report.js";

const sampleInput: PdfReportInput = {
  projectName: "demo-app",
  framework: "nextjs",
  packageManager: "npm",
  deploymentTarget: "vercel",
  scannedAt: "2026-07-08T12:00:00.000Z",
  productionReady: false,
  scores: {
    overall: 72,
    migration: 65,
    security: 80,
    aiReadiness: 70,
    seo: 75,
    deployment: 68,
  },
  blockers: [{ title: "Node fs usage", description: "Workers cannot use native fs APIs." }],
  findings: [
    {
      severity: "high",
      title: "Missing security headers",
      description: "No CSP configured.",
      recommendation: "Add Content-Security-Policy headers.",
    },
  ],
};

describe("pdf-report", () => {
  it("generates a valid PDF byte stream", async () => {
    const bytes = await generatePdfReport(sampleInput);
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe("%PDF");
  });
});
