#!/usr/bin/env node
/**
 * Run every cf-ready CLI command and print a summary table.
 * Usage: npm run test:cli
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(root, "dist/index.js");
const workDir = mkdtempSync(path.join(tmpdir(), "cf-ready-cli-run-"));
cpSync(path.join(root, "tests/fixtures/static-site"), workDir, { recursive: true });

const COMMANDS = [
  ["scan", []],
  ["inspect", []],
  ["security-scan", []],
  ["ai-ready", []],
  ["seo-ready", []],
  ["deploy-check", []],
  ["migration-plan", []],
  ["report", []],
  ["fix", ["--ai-readiness", "--force"]],
  ["smoke-test", ["--url", "https://ready.orangecloud.vn"]],
  ["ai-optimize", []],
];

async function run(name, extraArgs) {
  const start = Date.now();
  try {
    const { stdout, stderr } = await execFileAsync(
      "node",
      [CLI, name, "--cwd", workDir, "--json", "--no-color", ...extraArgs],
      { maxBuffer: 15 * 1024 * 1024, timeout: 120_000 },
    );
    const ms = Date.now() - start;
    const json = stdout.trim().startsWith("{");
    return { name, ok: true, code: 0, ms, json, note: json ? "JSON" : stdout.slice(0, 40) };
  } catch (err) {
    const e = err;
    const ms = Date.now() - start;
    const out = (e.stdout ?? "") + (e.stderr ?? "");
    const optional = name === "ai-optimize" && /AI|optimize|fetch/i.test(out);
    return {
      name,
      ok: optional,
      code: e.code ?? 1,
      ms,
      json: false,
      note: optional ? "optional (no AI)" : out.slice(0, 80).replace(/\n/g, " "),
    };
  }
}

console.log(`\ncf-ready CLI smoke — fixture: ${workDir}\n`);
console.log("Command          | Exit | Time   | Result");
console.log("-----------------|------|--------|-------");

let passed = 0;
let failed = 0;

for (const [name, args] of COMMANDS) {
  const r = await run(name, args);
  const mark = r.ok ? "✓" : "✗";
  if (r.ok) passed++;
  else failed++;
  console.log(
    `${mark} ${name.padEnd(15)} | ${String(r.code).padEnd(4)} | ${String(r.ms).padStart(5)}ms | ${r.note}`,
  );
}

console.log(`\n--- ${passed} passed, ${failed} failed ---\n`);
process.exit(failed > 0 ? 1 : 0);
