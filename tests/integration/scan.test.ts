import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createScanContext } from "../../src/core/context.js";
import { writeAllReports } from "../../src/core/report.js";
import { fileExists } from "../../src/core/filesystem.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "../fixtures");

describe("integration: scan", () => {
  it("scans nextjs fixture and generates reports", async () => {
    const fixturePath = path.join(fixtures, "nextjs-app");
    const context = await createScanContext({ rootDir: fixturePath });

    expect(context.inspection.framework).toBe("nextjs");
    expect(context.findings.length).toBeGreaterThan(0);
    expect(context.scores.overall).toBeGreaterThanOrEqual(0);

    const migrationBlockers = context.findings.filter(
      (f) => f.category === "migration" && f.severity === "blocker",
    );
    expect(migrationBlockers.length).toBeGreaterThan(0);

    const reports = await writeAllReports(context);
    expect(reports.length).toBe(10);

    const reportPath = path.join(fixturePath, "cf-ready-report.json");
    expect(await fileExists(reportPath)).toBe(true);
  });

  it("scans vite fixture", async () => {
    const context = await createScanContext({ rootDir: path.join(fixtures, "vite-app") });
    expect(context.inspection.framework).toBe("vite");
    expect(context.findings.some((f) => f.category === "ai-readiness")).toBe(true);
  });

  it("scans express fixture with node blockers", async () => {
    const context = await createScanContext({ rootDir: path.join(fixtures, "express-app") });
    expect(context.inspection.framework).toBe("express");
    expect(context.findings.some((f) => f.title.includes("Express"))).toBe(true);
  });
});
