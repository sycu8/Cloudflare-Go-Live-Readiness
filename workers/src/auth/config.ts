import type { Env } from "../types.js";

export type AuthProviderConfig = {
  google: boolean;
  github: boolean;
  authEnforced: boolean;
  openMode: boolean;
  publicUrl: string;
  githubCallbackUrl: string;
  googleCallbackUrl: string;
};

export function getAuthProviderConfig(env: Env): AuthProviderConfig {
  const publicUrl = (env.WORKER_PUBLIC_URL ?? "https://ready.orangecloud.vn").replace(/\/$/, "");
  const google = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const github = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
  const authEnforced = google || github;

  return {
    google,
    github,
    authEnforced,
    openMode: !authEnforced,
    publicUrl,
    githubCallbackUrl:
      env.GITHUB_REDIRECT_URI ?? `${publicUrl}/api/auth/github/callback`,
    googleCallbackUrl:
      env.GOOGLE_REDIRECT_URI ?? `${publicUrl}/api/auth/google/callback`,
  };
}

export function isAuthEnforced(env: Env): boolean {
  return getAuthProviderConfig(env).authEnforced;
}

export function handleAuthConfig(env: Env): Response {
  return Response.json(getAuthProviderConfig(env));
}
