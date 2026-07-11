#!/usr/bin/env node
/**
 * Verify production OAuth configuration.
 *
 * Usage:
 *   node scripts/verify-oauth-config.mjs
 *   BASE_URL=https://ready.orangecloud.vn node scripts/verify-oauth-config.mjs
 */
const BASE_URL = (process.env.BASE_URL ?? "https://ready.orangecloud.vn").replace(/\/$/, "");

const checks = [];

function pass(name, detail = "") {
  checks.push({ ok: true, name, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  checks.push({ ok: false, name, detail });
  console.log(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log(`\nOAuth config verify — ${BASE_URL}\n`);

  const health = await fetch(`${BASE_URL}/api/health`);
  if (health.ok) pass("health");
  else fail("health", String(health.status));

  const configRes = await fetch(`${BASE_URL}/api/auth/config`);
  if (!configRes.ok) {
    fail("auth/config", String(configRes.status));
    summarize();
    process.exit(1);
  }

  const config = await configRes.json();
  pass(
    "auth/config",
    `github=${config.github} google=${config.google} enforced=${config.authEnforced}`,
  );

  if (config.publicUrl?.includes("ready.orangecloud.vn")) {
    pass("publicUrl", config.publicUrl);
  } else {
    fail("publicUrl", config.publicUrl ?? "missing");
  }

  if (config.githubCallbackUrl?.includes("/api/auth/github/callback")) {
    pass("githubCallbackUrl");
  } else {
    fail("githubCallbackUrl", config.githubCallbackUrl ?? "missing");
  }

  if (config.googleCallbackUrl?.includes("/api/auth/google/callback")) {
    pass("googleCallbackUrl");
  } else {
    fail("googleCallbackUrl", config.googleCallbackUrl ?? "missing");
  }

  const googleJson = await fetch(`${BASE_URL}/api/auth/google`, {
    headers: { Accept: "application/json" },
  });
  if (config.google) {
    if (googleJson.status === 302 || googleJson.status === 501) {
      pass("google/login endpoint", `status ${googleJson.status}`);
    } else {
      fail("google/login endpoint", `unexpected ${googleJson.status}`);
    }
  } else {
    if (googleJson.status === 501) {
      pass("google not configured (expected)", "add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET");
    } else {
      fail("google not configured", `status ${googleJson.status}`);
    }
  }

  const githubRes = await fetch(`${BASE_URL}/api/auth/github/login`, {
    redirect: "manual",
    headers: { Accept: "application/json" },
  });
  if (config.github) {
    if (githubRes.status === 302) pass("github/login redirect");
    else fail("github/login", `status ${githubRes.status}`);
  } else {
    fail("github", "not configured on production");
  }

  summarize();
  process.exit(checks.some((c) => !c.ok) ? 1 : 0);
}

function summarize() {
  const ok = checks.filter((c) => c.ok).length;
  const bad = checks.filter((c) => !c.ok).length;
  console.log(`\n--- ${ok} passed, ${bad} failed ---\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
