#!/usr/bin/env node
/**
 * Pre-publish checks for @orangecloud/cf-ready on the public npm registry.
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

const errors = [];

if (pkg.name !== "@orangecloud/cf-ready") {
  errors.push(`Unexpected package name: ${pkg.name}`);
}

if (!pkg.bin?.["cf-ready"]) {
  errors.push("Missing bin.cf-ready entry");
}

if (!existsSync("dist/index.js")) {
  errors.push("dist/index.js missing — run npm run build");
}

const workerOnly = ["@cloudflare/sandbox", "wrangler", "@cloudflare/workers-types"];
for (const dep of workerOnly) {
  if (pkg.dependencies?.[dep]) {
    errors.push(`Worker-only dependency must not be in dependencies: ${dep}`);
  }
}

const requiredDeps = ["commander", "zod", "execa", "fast-glob", "pdf-lib", "picocolors"];
for (const dep of requiredDeps) {
  if (!pkg.dependencies?.[dep]) {
    errors.push(`Missing CLI runtime dependency: ${dep}`);
  }
}

if (pkg.publishConfig?.access !== "public") {
  errors.push('publishConfig.access must be "public" for scoped package');
}

if (errors.length) {
  console.error("npm package validation failed:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`Validating CLI smoke test for @orangecloud/cf-ready@${pkg.version}…`);
const out = execSync("node dist/index.js scan --cwd tests/fixtures/static-site --json", {
  encoding: "utf8",
});
const result = JSON.parse(out);
if (!result.scores?.overall && result.scores?.overall !== 0) {
  console.error("CLI smoke test failed: missing scores.overall");
  process.exit(1);
}

console.log(`OK — @orangecloud/cf-ready@${pkg.version} ready for npm publish`);
