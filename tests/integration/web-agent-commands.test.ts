import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, "../../dist/index.js");
const FIXTURE = path.join(__dirname, "../fixtures/static-site");

/** Commands exposed as quick chips in web/src/app.ts */
const WEB_AGENT_COMMANDS = [
  "scan",
  "inspect",
  "security-scan",
  "ai-ready",
  "seo-ready",
  "deploy-check",
  "migration-plan",
  "ai-optimize",
];

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync("node", [CLI, ...args], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
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

describe("web agent commands (CLI in sandbox)", () => {
  for (const command of WEB_AGENT_COMMANDS) {
    it(`runs ${command} on static-site fixture with --json`, async () => {
      const { stdout, stderr, code } = await runCli([
        command,
        "--cwd",
        FIXTURE,
        "--json",
        "--no-color",
      ]);

      if (command === "ai-optimize") {
        // May fail without AI worker URL in CI — accept structured error or JSON
        if (code !== 0) {
          expect(stderr + stdout).toMatch(/AI|optimize|error|fetch/i);
          return;
        }
      } else {
        expect(code).toBeLessThanOrEqual(1);
      }

      const trimmed = stdout.trim();
      if (trimmed.startsWith("{")) {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        expect(parsed).toBeTruthy();
        if (command === "scan") {
          expect(parsed).toHaveProperty("scores");
        }
        if (command === "inspect") {
          expect(parsed).toHaveProperty("framework");
        }
      }
    });
  }

  it("parseGitHubRepoUrl shorthand matches web agent import format", async () => {
    const { parseGitHubRepoUrl } = await import("../../workers/src/github.js");
    const parsed = parseGitHubRepoUrl("sycu8/cloudflare-go-live-readiness");
    expect(parsed?.owner).toBe("sycu8");
    expect(parsed?.repo).toBe("cloudflare-go-live-readiness");
  });
});
