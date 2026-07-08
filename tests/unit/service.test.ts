import { describe, it, expect } from "vitest";
import { runCommand } from "../../src/service/run-command.js";
import path from "node:path";

const fixtureDir = path.join(process.cwd(), "tests/fixtures/static-site");

describe("service layer", () => {
  it("runCommand scan returns scores", async () => {
    const result = await runCommand("scan", { rootDir: fixtureDir });
    expect(result.exitCode).toBeGreaterThanOrEqual(0);
    const data = result.data as { scores: { overall: number } };
    expect(data.scores.overall).toBeGreaterThan(0);
  });

  it("runCommand inspect returns framework", async () => {
    const result = await runCommand("inspect", { rootDir: fixtureDir });
    const data = result.data as { framework: string };
    expect(data.framework).toBe("static");
  });
});
