import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runScan } from "../../src/service/run-scan.js";
import { fileExists } from "../../src/core/filesystem.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("runScan skipReports", () => {
  const fixturePath = path.join(fixtures, "vite-app");
  const reportPath = path.join(fixturePath, "cf-ready-report.json");

  beforeEach(async () => {
    if (await fileExists(reportPath)) {
      await unlink(reportPath);
    }
  });

  it("skips writing report files when skipReports is true", async () => {
    const result = await runScan({ rootDir: fixturePath, skipReports: true });

    expect(result.data.scores.overall).toBeGreaterThanOrEqual(0);
    expect(result.data.reports).toEqual([]);
    expect(await fileExists(reportPath)).toBe(false);
  });
});
