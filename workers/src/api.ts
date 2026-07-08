import type { Env } from "./types.js";
import {
  handleAuthLogout,
  handleAuthMe,
  forbiddenResponse,
  requireAuth,
} from "./auth/handlers.js";
import { handleAuthConfig, isAuthEnforced } from "./auth/config.js";
import { googleAuthCallback, googleLoginRedirect } from "./auth/google.js";
import {
  githubAuthCallback,
  getGitHubToken,
  githubLoginRedirect,
  listGitHubRepos,
  resolveGitHubConnectRedirect,
} from "./auth/github.js";
import {
  assertWorkspaceSessionOwner,
  getUserFromRequest,
  linkWorkspaceSession,
} from "./auth/session.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extraHeaders },
  });
}

function sessionIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/api\/sessions\/([^/]+)/);
  return match?.[1] ?? null;
}

function stubId(): string {
  return crypto.randomUUID();
}

export async function handleApiRequest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (!pathname.startsWith("/api/")) return null;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (pathname === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "cf-ready-agent" });
  }

  if (pathname === "/api/webhooks/github" && request.method === "POST") {
    const { handleGitHubWebhook } = await import("./github-webhook.js");
    return handleGitHubWebhook(request, env);
  }

  // --- User authentication ---
  if (pathname === "/api/auth/config" && request.method === "GET") {
    return handleAuthConfig(env);
  }

  if (pathname === "/api/auth/me" && request.method === "GET") {
    return handleAuthMe(request, env);
  }

  if (pathname === "/api/auth/logout" && request.method === "POST") {
    return handleAuthLogout(request, env);
  }

  if (pathname === "/api/auth/google" && request.method === "GET") {
    return googleLoginRedirect(
      env,
      url.searchParams.get("returnTo") ?? undefined,
      request.headers.get("Accept"),
    );
  }

  if (pathname === "/api/auth/google/callback" && request.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return json({ error: "Missing code or state" }, 400);
    return googleAuthCallback(env, code, state);
  }

  if (pathname === "/api/auth/github/login" && request.method === "GET") {
    return githubLoginRedirect(
      env,
      url.searchParams.get("returnTo") ?? undefined,
      request.headers.get("Accept"),
    );
  }

  if (pathname === "/api/auth/github/callback" && request.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return json({ error: "Missing code or state" }, 400);
    return githubAuthCallback(env, code, state);
  }

  // GitHub repo connect (requires workspace session id)
  if (pathname === "/api/auth/github" && request.method === "GET") {
    const workspaceSessionId = url.searchParams.get("session");
    if (!workspaceSessionId) {
      return githubLoginRedirect(
        env,
        url.searchParams.get("returnTo") ?? undefined,
        request.headers.get("Accept"),
      );
    }
    return resolveGitHubConnectRedirect(env, request, workspaceSessionId);
  }

  if (pathname === "/api/sessions" && request.method === "POST") {
    const id = stubId();
    const doId = env.SESSION.idFromName(id);
    const stub = env.SESSION.get(doId);
    await stub.fetch("http://do/status");

    if (isAuthEnforced(env)) {
      const auth = await requireAuth(request, env);
      if (auth instanceof Response) return auth;
      await linkWorkspaceSession(env, auth.id, id);
    }

    return json({ sessionId: id });
  }

  const sessionId = sessionIdFromPath(pathname);
  if (!sessionId) {
    return json({ error: "Not found" }, 404);
  }

  if (isAuthEnforced(env)) {
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return json({ error: "Authentication required. Sign in with Google or GitHub." }, 401);
    }

    const ownsSession = await assertWorkspaceSessionOwner(env, user.id, sessionId);
    if (!ownsSession) {
      return forbiddenResponse("You do not have access to this workspace session");
    }
  }

  const user = isAuthEnforced(env) ? await getUserFromRequest(request, env) : null;

  const stub = env.SESSION.get(env.SESSION.idFromName(sessionId));

  if (pathname.endsWith("/auth/github/repos") && request.method === "GET") {
    const token = await getGitHubToken(env, sessionId, user?.id);
    if (!token) return json({ error: "GitHub not connected for private repos" }, 401);
    const repos = await listGitHubRepos(token);
    return json({ repos });
  }

  if (pathname.endsWith("/import/github") && request.method === "POST") {
    const body = (await request.json()) as Record<string, unknown>;
    const token = await getGitHubToken(env, sessionId, user?.id);
    if (token) body.token = token;
    return stub.fetch(
      new Request("http://do/import/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  const subPath = pathname.replace(`/api/sessions/${sessionId}`, "");
  const doUrl = `http://do${subPath || "/status"}`;
  return stub.fetch(
    new Request(doUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    }),
  );
}
