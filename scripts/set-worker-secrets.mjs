#!/usr/bin/env node
/**
 * Upload OAuth secrets to the Cloudflare Worker when present in env.
 * Used by GitHub Actions (from repository secrets) or manual deploy.
 */
import { execSync } from "node:child_process";

const SECRETS = [
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_WEBHOOK_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "AI_API_KEY",
];

let configured = 0;

for (const name of SECRETS) {
  const value = process.env[name];
  if (!value?.trim()) {
    console.log(`skip ${name} (not set)`);
    continue;
  }

  try {
    execSync(`npx wrangler secret put ${name}`, {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
    });
    configured++;
    console.log(`set ${name}`);
  } catch (error) {
    console.error(`failed to set ${name}`, error);
    process.exit(1);
  }
}

if (configured === 0) {
  console.warn(
    "No Worker secrets were set. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to GitHub repository secrets (Settings → Secrets and variables → Actions), or run: wrangler secret put GITHUB_CLIENT_ID",
  );
} else {
  console.log(`Configured ${configured} Worker secret(s).`);
  console.log("Verify: curl https://ready.orangecloud.vn/api/auth/config");
}
