#!/usr/bin/env node
/**
 * Ensures a KV namespace exists and patches wrangler.jsonc before deploy.
 */
import { readFileSync, writeFileSync } from "node:fs";

const TITLE = "cf-ready-sessions";
const PLACEHOLDER = "00000000000000000000000000000000";
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!token || !accountId) {
  console.error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

const listRes = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces?per_page=100`,
  { headers },
);
const listData = (await listRes.json()) as {
  success: boolean;
  result: Array<{ id: string; title: string }>;
};
if (!listData.success) {
  console.error("Failed to list KV namespaces", listData);
  process.exit(1);
}

let ns = listData.result.find((n) => n.title === TITLE);
if (!ns) {
  const createRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`,
    { method: "POST", headers, body: JSON.stringify({ title: TITLE }) },
  );
  const createData = (await createRes.json()) as {
    success: boolean;
    result: { id: string; title: string };
  };
  if (!createData.success) {
    console.error("Failed to create KV namespace", createData);
    process.exit(1);
  }
  ns = createData.result;
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
