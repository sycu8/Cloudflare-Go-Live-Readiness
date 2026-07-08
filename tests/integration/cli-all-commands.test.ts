import { describe, it, expect, beforeAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, "../../dist/index.js");
const FIXTURES = path.join(__dirname, "../fixtures");

/** All commands registered in src/cli/index.ts */
const CLI_COMMANDS = [
  { name: "scan", args: [] as string[] },
  { name: "inspect", args: [] },
  { name: "security-scan", args: [] },
  { name: "ai-ready", args: [] },
  { name: "seo-ready", args: [] },
  { name: "deploy-check", args: [] },
  { name: "migration-plan", args: [] },
  { name: "report", args: [] },
  { name: "fix", args: ["--ai-readiness", "--force"] },
  { name: "smoke-test", args: ["--url", "https://ready.orangecloud.vn"] },
  { name: "ai-optimize", args: [], optional: true },
] as const;

async function runCli(
  args: string[],
  opts?: { timeout?: number },
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync("node", [CLI, ...args], {
      maxBuffer: 15 * 1024 * 1024,
      timeout: opts?.timeout ?? 180_000,
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

describe("CLI all commands", () => {
  let workDir: string;

  beforeAll(() => {
    workDir = mkdtempSync(path.join(tmpdir(), "cf-ready-cli-"));
    cpSync(path.join(FIXTURES, "static-site"), workDir, { recursive: true });
  });

  for (const cmd of CLI_COMMANDS) {
    it(`cf-ready ${cmd.name} ${cmd.args.join(" ")}`.trim(), async () => {
      const { stdout, stderr, code } = await runCli(
        [cmd.name, "--cwd", workDir, "--json", "--no-color", ...cmd.args],
        { timeout: cmd.name === "ai-optimize" ? 120_000 : 90_000 },
      );

      if ("optional" in cmd && cmd.optional) {
        if (code !== 0) {
          expect(stderr + stdout).toMatch(/AI|optimize|error|fetch|network/i);
          return;
        }
      } else if (cmd.name === "smoke-test") {
        expect(code).toBeLessThanOrEqual(1);
        const parsed = JSON.parse(stdout.trim()) as { baseUrl?: string };
        expect(parsed.baseUrl).toContain("ready.orangecloud.vn");
        return;
      } else if (cmd.name === "fix") {
        expect(code).toBe(0);
        const parsed = JSON.parse(stdout.trim()) as { results?: unknown[] };
        expect(Array.isArray(parsed.results)).toBe(true);
        return;
      } else {
        expect(code).toBeLessThanOrEqual(1);
      }

      const trimmed = stdout.trim();
      expect(trimmed.length).toBeGreaterThan(0);
      if (trimmed.startsWith("{")) {
        expect(() => JSON.parse(trimmed)).not.toThrow();
      }
    });
  }

  it("cf-ready --version", async () => {
    const { stdout, code } = await runCli(["--version"]);
    expect(code).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("cf-ready --help lists commands", async () => {
    const { stdout, code } = await runCli(["--help"]);
    expect(code).toBe(0);
    for (const cmd of ["scan", "inspect", "security-scan", "report", "fix"]) {
      expect(stdout).toContain(cmd);
    }
  });

  it("fix without flags exits 2", async () => {
    const { code, stderr } = await runCli(["fix", "--cwd", workDir]);
    expect(code).toBe(2);
    expect(stderr).toMatch(/Specify --ai-readiness/);
  });
});

describe("CLI fixtures matrix", () => {
  const matrix = [
    { fixture: "nextjs-app", command: "scan" },
    { fixture: "vite-app", command: "inspect" },
    { fixture: "express-app", command: "migration-plan" },
  ] as const;

  for (const { fixture, command } of matrix) {
    it(`${command} on ${fixture}`, async () => {
      const { stdout, code } = await runCli([
        command,
        "--cwd",
        path.join(FIXTURES, fixture),
        "--json",
        "--no-color",
      ]);
      expect(code).toBeLessThanOrEqual(1);
      expect(stdout.trim().startsWith("{")).toBe(true);
    });
  }
});
