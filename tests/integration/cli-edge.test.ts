import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, "../../dist/index.js");
const FIXTURES = path.join(__dirname, "../fixtures");

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync("node", [CLI, ...args], {
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr, code: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      code: err.code ?? 1,
    };
  }
}

describe("CLI edge cases", () => {
  it("scan --json emits only JSON on stdout", async () => {
    const { stdout, code } = await runCli([
      "scan",
      "--cwd",
      path.join(FIXTURES, "static-site"),
      "--json",
    ]);
    expect(code).toBeGreaterThanOrEqual(0);
    expect(stdout.trim().startsWith("{")).toBe(true);
    expect(stdout).not.toContain("Cloudflare Go-Live Readiness Scan");
    JSON.parse(stdout);
  });

  it("errors when explicit --config file is missing", async () => {
    const { stderr, code } = await runCli([
      "scan",
      "--cwd",
      path.join(FIXTURES, "static-site"),
      "--config",
      "/tmp/does-not-exist-cf-ready-config.json",
    ]);
    expect(code).toBe(2);
    expect(stderr).toMatch(/Config file not found/);
  });

  it("errors with clear message when --cwd does not exist", async () => {
    const { stderr, code } = await runCli([
      "scan",
      "--cwd",
      "/tmp/cf-ready-nonexistent-root-xyz",
    ]);
    expect(code).toBe(2);
    expect(stderr).toMatch(/does not exist/);
  });

  it("formats invalid config validation errors readably", async () => {
    const configPath = path.join(FIXTURES, "static-site", "bad-config.json");
    const fs = await import("node:fs/promises");
    await fs.writeFile(configPath, '{"productionUrl":"not-a-url"}');
    try {
      const { stderr, code } = await runCli([
        "scan",
        "--cwd",
        path.join(FIXTURES, "static-site"),
        "--config",
        configPath,
      ]);
      expect(code).toBe(2);
      expect(stderr).toMatch(/productionUrl: Invalid url/);
    } finally {
      await fs.unlink(configPath).catch(() => {});
    }
  });

  it("detects root-level robots.txt on static sites", async () => {
    const { stdout, code } = await runCli([
      "ai-ready",
      "--cwd",
      path.join(FIXTURES, "static-site"),
      "--json",
    ]);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout) as { findings: Array<{ title: string }> };
    const missingRobots = parsed.findings.find((f) => f.title === "Missing robots.txt");
    expect(missingRobots).toBeUndefined();
  });

  it("fix without flags exits 2", async () => {
    const { code } = await runCli(["fix", "--cwd", path.join(FIXTURES, "static-site")]);
    expect(code).toBe(2);
  });
});
