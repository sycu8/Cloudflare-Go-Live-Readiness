#!/usr/bin/env node
/**
 * Publish DNS-AID SVCB/HTTPS records for ready.orangecloud.vn.
 *
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_ID=... node scripts/publish-dns-aid.mjs publish
 *   node scripts/publish-dns-aid.mjs show
 *   node scripts/publish-dns-aid.mjs verify
 *
 * The token needs Zone DNS Edit and Zone DNS Settings. DNSSEC signatures are
 * only authenticated (AD=1) after the parent zone publishes the DS record.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recordsFile = path.join(root, "dns", "records.json");
const spec = JSON.parse(readFileSync(recordsFile, "utf8"));
const domain = process.env.DNS_AID_DOMAIN || spec.domain;
const siteHost = spec.siteHost || `ready.${domain}`;
const command = process.argv[2] || "show";

function zoneFile() {
  const lines = [];
  for (const record of spec.records) {
    const owner = `${record.name}.${domain}.`;
    if (record.type === "TXT") {
      lines.push(`${owner} ${spec.ttl} IN TXT "${record.content}"`);
      continue;
    }
    lines.push(
      `${owner} ${spec.ttl} IN ${record.type} ${record.priority} ${record.target}. ${record.params}`,
    );
  }
  return lines.join("\n");
}

async function cf(method, pathname, body) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) {
    throw new Error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID are required");
  }
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!payload.success) {
    throw new Error(`Cloudflare ${method} ${pathname} failed: ${JSON.stringify(payload.errors)}`);
  }
  return payload;
}

async function upsert(record) {
  const fqdn = `${record.name}.${domain}`;
  const listed = await cf("GET", `/dns_records?type=${record.type}&name=${encodeURIComponent(fqdn)}`);
  const existing = (listed.result || []).find((item) => item.name === fqdn && item.type === record.type);
  const payload =
    record.type === "TXT"
      ? { type: "TXT", name: record.name, ttl: spec.ttl, content: record.content }
      : {
          type: record.type,
          name: record.name,
          ttl: spec.ttl,
          data: {
            priority: record.priority,
            target: record.target,
            value: record.params,
          },
        };
  if (existing) {
    console.log(`Updating ${record.type} ${fqdn}`);
    await cf("PUT", `/dns_records/${existing.id}`, payload);
  } else {
    console.log(`Creating ${record.type} ${fqdn}`);
    await cf("POST", "/dns_records", payload);
  }
}

async function publish() {
  for (const record of spec.records) {
    await upsert(record);
  }
  console.log(`Published ${spec.records.length} DNS-AID records in ${domain}.`);
}

async function dnssec() {
  const current = await cf("GET", "/dnssec");
  if (current.result?.status !== "active") {
    console.log("Enabling Cloudflare DNSSEC...");
    await cf("PATCH", "/dnssec", { status: "active" });
  } else {
    console.log("Cloudflare DNSSEC is already active.");
  }
  const details = await cf("GET", "/dnssec");
  const ds = details.result?.ds || [];
  if (ds.length === 0) {
    console.log("No DS records returned. Add the DS set from the Cloudflare dashboard at the registrar.");
    return;
  }
  console.log("Add these DS records at the registrar if the parent does not already publish them:");
  for (const item of ds) {
    console.log(`${item.key_tag} ${item.algorithm} ${item.digest_type} ${item.digest}`);
  }
}

async function doh(name, type) {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const response = await fetch(url, { headers: { accept: "application/dns-json" } });
  return response.json();
}

async function verify() {
  const names = [
    `_index._agents.${siteHost}`,
    `_a2a._agents.${siteHost}`,
    `_index._agents.${domain}`,
    `_a2a._agents.${domain}`,
  ];
  for (const name of names) {
    for (const type of ["SVCB", "HTTPS"]) {
      const answer = await doh(name, type);
      const rows = answer.Answer || [];
      console.log(
        `${name} ${type} status=${answer.Status} AD=${Boolean(answer.AD)} answers=${rows.length}`,
      );
    }
  }
}

if (command === "show") {
  console.log(zoneFile());
} else if (command === "publish") {
  await publish();
} else if (command === "dnssec") {
  await dnssec();
} else if (command === "verify") {
  await verify();
} else {
  console.error("Usage: publish-dns-aid.mjs <show|publish|dnssec|verify>");
  process.exit(1);
}
