import type { Env } from "../types.js";

export function oauthNotConfiguredResponse(
  env: Env,
  provider: "google" | "github",
  accept: string | null,
): Response {
  const message =
    provider === "google"
      ? "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
      : "GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.";

  const wantsHtml = accept?.includes("text/html");
  if (wantsHtml) {
    const base = (env.WORKER_PUBLIC_URL ?? "https://ready.orangecloud.vn").replace(/\/$/, "");
    return Response.redirect(
      `${base}/app/?auth_error=${provider}_not_configured`,
      302,
    );
  }

  return Response.json({ error: message }, { status: 501 });
}
