import type { Env } from "../types.js";
import { createOAuthState, consumeOAuthState } from "./oauth-state.js";
import { authCookieHeader, createAuthSession } from "./session.js";
import { upsertUserFromProvider } from "./users.js";
import { oauthNotConfiguredResponse } from "./errors.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function googleRedirectUri(env: Env): string {
  return env.GOOGLE_REDIRECT_URI ?? `${env.WORKER_PUBLIC_URL ?? ""}/api/auth/google/callback`;
}

function appBaseUrl(env: Env): string {
  return env.WORKER_PUBLIC_URL ?? "";
}

export async function googleLoginRedirect(
  env: Env,
  returnTo?: string,
  accept?: string | null,
): Promise<Response> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return oauthNotConfiguredResponse(env, "google", accept ?? null);
  }

  const state = await createOAuthState(env, {
    mode: "login",
    provider: "google",
    returnTo: returnTo ?? "/app/",
  });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(env),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  return Response.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`, 302);
}

export async function googleAuthCallback(
  env: Env,
  code: string,
  stateId: string,
): Promise<Response> {
  const state = await consumeOAuthState(env, stateId);
  if (!state || state.provider !== "google" || state.mode !== "login") {
    return Response.json({ error: "Invalid or expired OAuth state" }, { status: 400 });
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return Response.json({ error: "Google OAuth not configured" }, { status: 501 });
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleRedirectUri(env),
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenData.access_token) {
    return Response.json(
      { error: tokenData.error_description ?? tokenData.error ?? "Google OAuth failed" },
      { status: 400 },
    );
  }

  const profileRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileRes.ok) {
    return Response.json({ error: "Failed to fetch Google profile" }, { status: 502 });
  }

  const profile = (await profileRes.json()) as {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  if (!profile.email) {
    return Response.json({ error: "Google account has no email address" }, { status: 400 });
  }

  const user = await upsertUserFromProvider(env, {
    provider: "google",
    providerUserId: profile.sub,
    email: profile.email,
    name: profile.name ?? null,
    avatarUrl: profile.picture ?? null,
    accessToken: tokenData.access_token,
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
}
