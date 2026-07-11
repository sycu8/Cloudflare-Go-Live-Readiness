#!/usr/bin/env node
/**
 * E2E smoke test for Web Agent API (import + quick commands).
 *
 * Usage:
 *   node scripts/e2e-web-agent.mjs
 *   CF_READY_AUTH_COOKIE='cf_ready_auth=...' node scripts/e2e-web-agent.mjs
 *   BASE_URL=https://ready.orangecloud.vn node scripts/e2e-web-agent.mjs
 */
const BASE_URL = (process.env.BASE_URL ?? "https://ready.orangecloud.vn").replace(/\/$/, "");
const AUTH_COOKIE = normalizeAuthCookie(process.env.CF_READY_AUTH_COOKIE ?? "");
const PUBLIC_REPO =
  process.env.E2E_GITHUB_REPO ?? "https://github.com/sycu8/Cloudflare-Go-Live-Readiness";
const IMPORT_ONLY = process.env.E2E_IMPORT_ONLY === "1";
const COMMANDS = [
  "inspect",
  "scan",
  "security-scan",
  "ai-ready",
  "seo-ready",
  "deploy-check",
  "migration-plan",
];

const results = [];

function normalizeAuthCookie(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.includes("cf_ready_auth=")) return trimmed;
  return `cf_ready_auth=${trimmed}`;
}

function log(icon, msg) {
  console.log(`${icon} ${msg}`);
}

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  log("✓", `${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  log("✗", `${name}${detail ? ` — ${detail}` : ""}`);
}

async function api(path, opts = {}) {
  const headers = { ...(opts.headers ?? {}) };
  if (AUTH_COOKIE) headers.Cookie = AUTH_COOKIE;
  const res = await fetch(`${BASE_URL}${path}`, { ...opts, headers });
  const contentType = res.headers.get("content-type") ?? "";
  let body;
  if (contentType.includes("application/json")) {
    body = await res.json();
  } else {
    const text = await res.text();
    body = { _html: text.slice(0, 120) };
  }
  return { res, body };
}

async function waitForStatus(sessionId, want, timeoutMs = 300_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { res, body } = await api(`/api/sessions/${sessionId}/status`);
    if (!res.ok) throw new Error(body.error ?? `status ${res.status}`);
    if (body.status === "error") throw new Error(body.lastError ?? "session error");
    if (want(body.status)) return body;
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error(`timeout waiting for status (${timeoutMs}ms)`);
}

async function main() {
  console.log(`\nWeb Agent E2E — ${BASE_URL}\n`);

  const health = await api("/api/health");
  if (health.res.ok) pass("health");
  else if (health.res.status === 403 && process.env.GITHUB_ACTIONS) {
    console.log("⚠ health — 403 (edge/WAF blocking CI runners; skipping E2E)");
    process.exit(0);
  } else fail("health", String(health.res.status));

  const config = await api("/api/auth/config");
  if (config.res.ok) {
    pass("auth/config", `github=${config.body.github} enforced=${config.body.authEnforced}`);
  } else {
    fail("auth/config");
  }

  if (!AUTH_COOKIE && config.body.authEnforced) {
    fail("auth", "Set CF_READY_AUTH_COOKIE after signing in at /app/ (skip full flow)");
    printSummary();
    process.exit(1);
  }

  const created = await api("/api/sessions", { method: "POST" });
  if (!created.res.ok) {
    fail("create session", created.body.error ?? created.res.status);
    printSummary();
    process.exit(1);
  }
  const sessionId = created.body.sessionId;
  pass("create session", sessionId);

  const importRes = await api(`/api/sessions/${sessionId}/import/github`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl: PUBLIC_REPO }),
  });
  if (!importRes.res.ok) {
    fail("import github", importRes.body.error ?? importRes.body._html ?? importRes.res.status);
    printSummary();
    process.exit(1);
  }
  const staging = importRes.body.staging ?? "";
  pass(
    "import github started",
    `${importRes.body.status ?? "ok"}${staging ? ` staging=${staging}` : ""}`,
  );

  try {
    await waitForStatus(sessionId, (s) => s === "idle" || s === "done");
    pass("import github complete");
  } catch (err) {
    fail("import github complete", err instanceof Error ? err.message : String(err));
    printSummary();
    process.exit(1);
  }

  const files = await api(`/api/sessions/${sessionId}/files`);
  if (files.res.ok && Array.isArray(files.body.files) && files.body.files.length > 0) {
    pass("list files", `${files.body.files.length} files`);
  } else {
    fail("list files", files.body.error ?? "empty");
  }

  if (IMPORT_ONLY) {
    printSummary();
    process.exit(results.some((r) => !r.ok) ? 1 : 0);
  }

  for (const cmd of COMMANDS) {
    const execRes = await api(`/api/sessions/${sessionId}/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line: cmd }),
    });
    if (!execRes.res.ok) {
      fail(`exec ${cmd}`, execRes.body.error ?? execRes.res.status);
      continue;
    }
    try {
      await waitForStatus(sessionId, (s) => s === "done" || s === "idle" || s === "error", 300_000);
      const st = await api(`/api/sessions/${sessionId}/status`);
      if (st.body.status === "error") {
        fail(`exec ${cmd}`, st.body.lastError ?? "error");
        continue;
      }
      const resultsRes = await api(`/api/sessions/${sessionId}/results`);
      const hasResult = Boolean(resultsRes.body.result);
      pass(`exec ${cmd}`, hasResult ? "has results" : "ok");
    } catch (err) {
      fail(`exec ${cmd}`, err instanceof Error ? err.message : String(err));
    }
  }

  // ai-optimize may call worker AI — best-effort
  const optRes = await api(`/api/sessions/${sessionId}/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ line: "scan" }),
  });
  if (optRes.res.ok) {
    try {
      await waitForStatus(sessionId, (s) => s === "done" || s === "idle");
      const opt = await api(`/api/sessions/${sessionId}/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line: "ai-optimize" }),
      });
      if (opt.res.ok) {
        await waitForStatus(sessionId, (s) => s === "done" || s === "idle" || s === "error", 120_000);
        const st = await api(`/api/sessions/${sessionId}/status`);
        if (st.body.status === "error") fail("exec ai-optimize", st.body.lastError ?? "error");
        else pass("exec ai-optimize", "completed");
      } else {
        fail("exec ai-optimize", opt.body.error ?? "skipped");
      }
    } catch (err) {
      fail("exec ai-optimize", err instanceof Error ? err.message : String(err));
    }
  }

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const ok = results.filter((r) => r.ok).length;
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n--- ${ok} passed, ${bad} failed ---\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
