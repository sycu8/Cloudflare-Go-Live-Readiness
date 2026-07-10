import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createScanContext } from "../../src/core/context.js";
import { mergePartialScanResults } from "../../src/service/merge-scan.js";
import { runScan, serializeScanContext } from "../../src/service/run-scan.js";
import type { ScanModuleName } from "../../src/service/scan-modules.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, "../fixtures/static-site");

describe("mergePartialScanResults", () => {
  it("merges module scans into the same shape as a full scan", async () => {
    const modules: ScanModuleName[] = [
      "migration",
      "security",
      "ai-readiness",
      "seo",
      "deployment",
    ];
    const partials = await Promise.all(
      modules.map(async (module) => {
        const context = await createScanContext({ rootDir: fixturePath, modules: [module] });
        return serializeScanContext(context);
      }),
    );

    const merged = mergePartialScanResults(partials);
    const full = await runScan({ rootDir: fixturePath, skipReports: true });

    expect(merged.findings.length).toBe(full.data.findings.length);
    expect(merged.scores.overall).toBe(full.data.scores.overall);
    expect(merged.productionReady).toBe(full.data.productionReady);
    expect(merged.inspection.framework).toBe(full.data.inspection.framework);
  });

  it("throws when no valid partials are provided", () => {
    expect(() => mergePartialScanResults([null, { bad: true }])).toThrow(
      /No valid scan module results/,
    );
  });
});
