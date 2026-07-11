import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, "../../dist/index.js");
const FIXTURE = path.join(__dirname, "../fixtures/static-site");

describe("scan --modules", () => {
  it("runs a single module subset with --json", async () => {
    const { stdout } = await execFileAsync("node", [
      CLI,
      "scan",
      "--cwd",
      FIXTURE,
      "--modules",
      "migration",
      "--json",
      "--skip-reports",
    ]);
    const parsed = JSON.parse(stdout.trim()) as { findings: unknown[]; scores: { migration: number } };
    expect(Array.isArray(parsed.findings)).toBe(true);
    expect(typeof parsed.scores.migration).toBe("number");
  });
});
