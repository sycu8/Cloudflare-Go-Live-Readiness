import type { Env } from "../types.js";

export type AuthProviderConfig = {
  google: boolean;
  github: boolean;
  publicUrl: string;
  githubCallbackUrl: string;
  googleCallbackUrl: string;
};

export function getAuthProviderConfig(env: Env): AuthProviderConfig {
  const publicUrl = (env.WORKER_PUBLIC_URL ?? "https://ready.orangecloud.vn").replace(/\/$/, "");
  return {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    publicUrl,
    githubCallbackUrl:
      env.GITHUB_REDIRECT_URI ?? `${publicUrl}/api/auth/github/callback`,
    googleCallbackUrl:
      env.GOOGLE_REDIRECT_URI ?? `${publicUrl}/api/auth/google/callback`,
  };
}

export function handleAuthConfig(env: Env): Response {
  return Response.json(getAuthProviderConfig(env));
}
