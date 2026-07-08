import type { Env } from "./types.js";

export async function verifyGitHubWebhookSignature(
  secret: string,
  body: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expectedHex = signatureHeader.slice("sha256=".length);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const actualHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (actualHex.length !== expectedHex.length) return false;
  let mismatch = 0;
  for (let i = 0; i < actualHex.length; i++) {
    mismatch |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return mismatch === 0;
}

type PushEvent = {
  ref?: string;
  after?: string;
  repository?: { full_name?: string; default_branch?: string };
};

export async function handleGitHubWebhook(
  request: Request,
  env: Env,
): Promise<Response> {
  const secret = env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "GitHub webhook secret is not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("X-Hub-Signature-256");
  const event = request.headers.get("X-GitHub-Event") ?? "";

  if (!(await verifyGitHubWebhookSignature(secret, body, signature))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event === "ping") {
    return Response.json({ ok: true, message: "pong" });
  }

  if (event !== "push") {
    return Response.json({ ok: true, ignored: true, event });
  }

  let payload: PushEvent;
  try {
    payload = JSON.parse(body) as PushEvent;
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const fullName = payload.repository?.full_name;
  if (!fullName || !payload.after) {
    return Response.json({ ok: true, ignored: true, reason: "missing repository or commit" });
  }

  const [owner, repo] = fullName.split("/");
  const { listSessionsForRepo } = await import("./reports-cache.js");
  const sessionIds = await listSessionsForRepo(env, owner, repo);
  if (sessionIds.length === 0) {
    return Response.json({ ok: true, refreshed: 0 });
  }

  const refreshed: string[] = [];
  for (const sessionId of sessionIds) {
    const stub = env.SESSION.get(env.SESSION.idFromName(sessionId));
    const response = await stub.fetch("http://do/refresh/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commitSha: payload.after,
        ref: payload.ref?.replace("refs/heads/", "") ?? payload.repository?.default_branch ?? "main",
      }),
    });
    if (response.ok) refreshed.push(sessionId);
  }

  return Response.json({ ok: true, refreshed: refreshed.length, sessionIds: refreshed });
}
