import type { Env } from "./types.js";
import {
  githubAuthCallback,
  githubAuthRedirect,
  getGitHubToken,
  listGitHubRepos,
} from "./auth-github.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
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

  if (pathname === "/api/sessions" && request.method === "POST") {
    const id = stubId();
    const doId = env.SESSION.idFromName(id);
    const stub = env.SESSION.get(doId);
    await stub.fetch("http://do/status");
    return json({ sessionId: id });
  }

  const sessionId = sessionIdFromPath(pathname);
  if (!sessionId) {
    if (pathname === "/api/auth/github" && request.method === "GET") {
      const state = url.searchParams.get("session") ?? stubId();
      return githubAuthRedirect(env, state);
    }
    if (pathname === "/api/auth/github/callback" && request.method === "GET") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) return json({ error: "Missing code or state" }, 400);
      return githubAuthCallback(env, code, state);
    }
    return json({ error: "Not found" }, 404);
  }

  const stub = env.SESSION.get(env.SESSION.idFromName(sessionId));

  if (pathname.endsWith("/auth/github/repos") && request.method === "GET") {
    const token = await getGitHubToken(env, sessionId);
    if (!token) return json({ error: "GitHub not connected" }, 401);
    const repos = await listGitHubRepos(token);
    return json({ repos });
  }

  if (pathname.endsWith("/import/github") && request.method === "POST") {
    const token = await getGitHubToken(env, sessionId);
    if (token) {
      const body = (await request.json()) as Record<string, unknown>;
      body.token = token;
      return stub.fetch(new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(body),
      }));
    }
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
