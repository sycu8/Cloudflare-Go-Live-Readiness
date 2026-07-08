#!/usr/bin/env node
/**
 * Ensures a D1 database exists and patches wrangler.jsonc before deploy.
 */
import { readFileSync, writeFileSync } from "node:fs";

const DB_NAME = "cf-ready";
const PLACEHOLDER = "00000000-0000-0000-0000-000000000000";
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
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`,
  { headers },
);
const listData = await listRes.json();
if (!listData.success) {
  console.error("Failed to list D1 databases", listData);
  process.exit(1);
}

let db = listData.result.find((d) => d.name === DB_NAME);
if (!db) {
  const createRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`,
    { method: "POST", headers, body: JSON.stringify({ name: DB_NAME }) },
  );
  const createData = await createRes.json();
  if (!createData.success) {
    console.error("Failed to create D1 database", createData);
    process.exit(1);
  }
  db = createData.result;
  console.log(`Created D1 database ${DB_NAME}: ${db.uuid}`);
} else {
  console.log(`Using existing D1 database ${DB_NAME}: ${db.uuid}`);
}

const path = "wrangler.jsonc";
let config = readFileSync(path, "utf8");
if (config.includes(PLACEHOLDER)) {
  config = config.replaceAll(PLACEHOLDER, db.uuid);
  writeFileSync(path, config);
  console.log("Patched wrangler.jsonc with D1 database id");
}
