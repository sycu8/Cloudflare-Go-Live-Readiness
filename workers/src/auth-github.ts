import type { Env } from "./types.js";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

export function githubAuthRedirect(env: Env, state: string): Response {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_REDIRECT_URI) {
    return Response.json(
      { error: "GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_REDIRECT_URI." },
      { status: 501 },
    );
  }
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_REDIRECT_URI,
    scope: "repo",
    state,
  });
  return Response.redirect(`${GITHUB_AUTH_URL}?${params}`, 302);
}

export async function githubAuthCallback(
  env: Env,
  code: string,
  sessionId: string,
): Promise<Response> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return Response.json({ error: "GitHub OAuth not configured" }, { status: 501 });
  }

  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenData.access_token) {
    return Response.json(
      { error: tokenData.error_description ?? tokenData.error ?? "OAuth failed" },
      { status: 400 },
    );
  }

  if (env.SESSIONS) {
    await env.SESSIONS.put(`github:${sessionId}`, tokenData.access_token, {
      expirationTtl: 60 * 60 * 8,
    });
  }

  const appUrl = env.WORKER_PUBLIC_URL ?? "";
  return Response.redirect(`${appUrl}/app/?github=connected&session=${sessionId}`, 302);
}

export async function getGitHubToken(env: Env, sessionId: string): Promise<string | null> {
  if (!env.SESSIONS) return null;
  return env.SESSIONS.get(`github:${sessionId}`);
}

export async function listGitHubRepos(
  token: string,
): Promise<Array<{ full_name: string; private: boolean }>> {
  const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "cf-ready-agent",
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const repos = (await res.json()) as Array<{ full_name: string; private: boolean }>;
  return repos.map((r) => ({ full_name: r.full_name, private: r.private }));
}
