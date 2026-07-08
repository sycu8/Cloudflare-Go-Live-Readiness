#!/usr/bin/env node
/**
 * Full QA inventory runner — CLI, vitest, lint, UI scale checks.
 * Does not hit production unless BASE_URL is set explicitly.
 */
import { execSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const logPath = path.join(root, "tests/qa/results-full.log");
const buglogPath = path.join(root, "tests/qa/BUGLOG.md");

function log(section, msg) {
  const line = `[${new Date().toISOString()}] ${section}: ${msg}\n`;
  process.stdout.write(line);
  appendFileSync(logPath, line);
}

function run(cmd, label) {
  log("RUN", label);
  try {
    execSync(cmd, { cwd: root, stdio: "pipe", encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
    log("PASS", label);
    return true;
  } catch (err) {
    const e = err;
    log("FAIL", `${label}\n${e.stdout ?? ""}\n${e.stderr ?? ""}`);
    return false;
  }
}

writeFileSync(logPath, `=== QA full run ${new Date().toISOString()} ===\n`);

const steps = [
  ["npm run build -s", "CLI build"],
  ["node tests/qa/seed/generate-large-scan.mjs", "Regenerate large scan seed"],
  ["bash tests/qa/run-qa.sh", "CLI inventory (run-qa.sh)"],
  ["npm run lint", "ESLint"],
  ["npm run typecheck", "TypeScript"],
  ["npm test", "Vitest"],
];

let failed = 0;
for (const [cmd, label] of steps) {
  if (!run(cmd, label)) failed++;
}

const summary = failed === 0 ? "CLEAN PASS" : `${failed} step(s) failed`;
log("SUMMARY", summary);
appendFileSync(buglogPath, `\n## Full QA run ${new Date().toISOString()}\n- Result: **${summary}**\n- Log: tests/qa/results-full.log\n`);

process.exit(failed === 0 ? 0 : 1);
