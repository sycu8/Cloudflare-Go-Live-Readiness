#!/usr/bin/env node
/**
 * Ensures a KV namespace exists and patches wrangler.jsonc before deploy.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const TITLE = "cf-ready-sessions";
const PLACEHOLDER = "00000000000000000000000000000000";

function wranglerJson(cmd) {
  return execSync(`npx wrangler ${cmd}`, { encoding: "utf8" });
}

let list = [];
try {
  list = JSON.parse(wranglerJson("kv namespace list --json"));
} catch {
  list = [];
}

let ns = list.find((n) => n.title === TITLE);
if (!ns) {
  const created = JSON.parse(wranglerJson(`kv namespace create ${TITLE} --json`));
  ns = created;
  console.log(`Created KV namespace ${TITLE}: ${ns.id}`);
} else {
  console.log(`Using existing KV namespace ${TITLE}: ${ns.id}`);
}

const path = "wrangler.jsonc";
let config = readFileSync(path, "utf8");
if (config.includes(PLACEHOLDER)) {
  config = config
    .replaceAll(`"id": "${PLACEHOLDER}"`, `"id": "${ns.id}"`)
    .replaceAll(`"preview_id": "00000000000000000000000000000001"`, `"preview_id": "${ns.id}"`);
  writeFileSync(path, config);
  console.log("Patched wrangler.jsonc with KV namespace id");
}
