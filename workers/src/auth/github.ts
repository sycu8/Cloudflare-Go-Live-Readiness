import type { Env } from "../types.js";
import type { AuthUser } from "./types.js";
import { createOAuthState, consumeOAuthState } from "./oauth-state.js";
import {
  authCookieHeader,
  createAuthSession,
  getUserFromRequest,
  assertWorkspaceSessionOwner,
} from "./session.js";
import { forbiddenResponse } from "./handlers.js";
import { storeGitHubTokenForUser, upsertUserFromProvider, getUserById } from "./users.js";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

function githubRedirectUri(env: Env): string {
  return env.GITHUB_REDIRECT_URI ?? `${env.WORKER_PUBLIC_URL ?? ""}/api/auth/github/callback`;
}

function appBaseUrl(env: Env): string {
  return env.WORKER_PUBLIC_URL ?? "";
}

export async function githubLoginRedirect(
  env: Env,
  returnTo?: string,
): Promise<Response> {
  if (!env.GITHUB_CLIENT_ID) {
    return Response.json(
      { error: "GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET." },
      { status: 501 },
    );
  }

  const state = await createOAuthState(env, {
    mode: "login",
    provider: "github",
    returnTo: returnTo ?? "/app/",
  });

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: githubRedirectUri(env),
    scope: "read:user user:email repo",
    state,
  });

  return Response.redirect(`${GITHUB_AUTH_URL}?${params.toString()}`, 302);
}

export async function githubConnectRedirect(
  env: Env,
  workspaceSessionId: string,
  user: AuthUser,
): Promise<Response> {
  if (!env.GITHUB_CLIENT_ID) {
    return Response.json({ error: "GitHub OAuth not configured" }, { status: 501 });
  }

  const state = await createOAuthState(env, {
    mode: "connect",
    provider: "github",
    workspaceSessionId,
    userId: user.id,
    returnTo: `/app/?github=connected&session=${workspaceSessionId}`,
  });

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: githubRedirectUri(env),
    scope: "repo",
    state,
  });

  return Response.redirect(`${GITHUB_AUTH_URL}?${params.toString()}`, 302);
}

/** Legacy: connect GitHub without account login (anonymous session). */
export async function githubLegacyConnectRedirect(
  env: Env,
  workspaceSessionId: string,
): Promise<Response> {
  if (!env.GITHUB_CLIENT_ID) {
    return Response.json(
      { error: "GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_REDIRECT_URI." },
      { status: 501 },
    );
  }

  const state = await createOAuthState(env, {
    mode: "connect",
    provider: "github",
    workspaceSessionId,
    returnTo: `/app/?github=connected&session=${workspaceSessionId}`,
  });

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: githubRedirectUri(env),
    scope: "repo",
    state,
  });

  return Response.redirect(`${GITHUB_AUTH_URL}?${params.toString()}`, 302);
}

async function exchangeGitHubCode(env: Env, code: string): Promise<string> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new Error("GitHub OAuth not configured");
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
    throw new Error(tokenData.error_description ?? tokenData.error ?? "OAuth failed");
  }

  return tokenData.access_token;
}

async function fetchGitHubProfile(accessToken: string): Promise<{
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
}> {
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "cf-ready-agent",
    },
  });
  if (!userRes.ok) throw new Error(`GitHub API error: ${userRes.status}`);
  const user = (await userRes.json()) as {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string | null;
    email: string | null;
  };

  if (!user.email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "cf-ready-agent",
      },
    });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primary = emails.find((e) => e.primary && e.verified) ?? emails[0];
      user.email = primary?.email ?? `${user.login}@users.noreply.github.com`;
    } else {
      user.email = `${user.login}@users.noreply.github.com`;
    }
  }

  return user;
}

export async function githubAuthCallback(
  env: Env,
  code: string,
  stateId: string,
): Promise<Response> {
  const state = await consumeOAuthState(env, stateId);
  if (!state || state.provider !== "github") {
    return Response.json({ error: "Invalid or expired OAuth state" }, { status: 400 });
  }

  try {
    const accessToken = await exchangeGitHubCode(env, code);

    if (state.mode === "connect") {
      const profile = await fetchGitHubProfile(accessToken);

      if (state.userId) {
        const account = await getUserById(env, state.userId);
        if (account) {
          await upsertUserFromProvider(env, {
            provider: "github",
            providerUserId: String(profile.id),
            email: profile.email ?? account.email,
            name: profile.name ?? profile.login,
            avatarUrl: profile.avatar_url,
            accessToken,
            profileJson: JSON.stringify(profile),
          });
        }
        await storeGitHubTokenForUser(
          env,
          state.userId,
          accessToken,
          state.workspaceSessionId,
        );
      } else if (state.workspaceSessionId && env.SESSIONS) {
        await env.SESSIONS.put(`github:${state.workspaceSessionId}`, accessToken, {
          expirationTtl: 60 * 60 * 8,
        });
      }

      const returnTo = state.returnTo ?? `${appBaseUrl(env)}/app/`;
      return Response.redirect(
        returnTo.startsWith("http") ? returnTo : `${appBaseUrl(env)}${returnTo}`,
        302,
      );
    }

    const profile = await fetchGitHubProfile(accessToken);
    const user = await upsertUserFromProvider(env, {
      provider: "github",
      providerUserId: String(profile.id),
      email: profile.email!,
      name: profile.name ?? profile.login,
      avatarUrl: profile.avatar_url,
      accessToken,
      profileJson: JSON.stringify(profile),
    });

    const authSessionId = await createAuthSession(env, user.id);
    const returnTo = state.returnTo ?? "/app/";

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${appBaseUrl(env)}${returnTo}`,
        "Set-Cookie": authCookieHeader(authSessionId),
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}

export async function getGitHubToken(
  env: Env,
  workspaceSessionId: string,
  userId?: string,
): Promise<string | null> {
  if (env.SESSIONS) {
    const sessionToken = await env.SESSIONS.get(`github:${workspaceSessionId}`);
    if (sessionToken) return sessionToken;
    if (userId) {
      const userToken = await env.SESSIONS.get(`github:user:${userId}`);
      if (userToken) return userToken;
    }
  }

  if (userId && env.DB) {
    const row = await env.DB.prepare(
      "SELECT access_token FROM identities WHERE user_id = ? AND provider = 'github'",
    )
      .bind(userId)
      .first<{ access_token: string | null }>();
    if (row?.access_token) return row.access_token;
  }

  return null;
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

export async function resolveGitHubConnectRedirect(
  env: Env,
  request: Request,
  workspaceSessionId: string,
): Promise<Response> {
  const user = await getUserFromRequest(request, env);
  if (user) {
    const ownsSession = await assertWorkspaceSessionOwner(env, user.id, workspaceSessionId);
    if (!ownsSession) {
      return forbiddenResponse("You do not have access to this workspace session");
    }
    return githubConnectRedirect(env, workspaceSessionId, user);
  }
  return githubLegacyConnectRedirect(env, workspaceSessionId);
}
