import type { Env } from "../types.js";
import type { AuthUser } from "./types.js";
import {
  clearAuthCookieHeader,
  deleteAuthSession,
  getUserFromRequest,
  parseAuthCookie,
} from "./session.js";
import { getUserProviders } from "./users.js";

export async function handleAuthMe(request: Request, env: Env): Promise<Response> {
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return Response.json({ authenticated: false, user: null }, { status: 401 });
  }

  const providers = await getUserProviders(env, user.id);
  const githubConnected = providers.some((p) => p.provider === "github");

  return Response.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    providers: providers.map((p) => p.provider),
    githubConnected,
  });
}

export async function handleAuthLogout(request: Request, env: Env): Promise<Response> {
  const authSessionId = parseAuthCookie(request);
  if (authSessionId) {
    await deleteAuthSession(env, authSessionId);
  }

  return Response.json(
    { ok: true },
    {
      headers: { "Set-Cookie": clearAuthCookieHeader() },
    },
  );
}

export function unauthorizedResponse(message = "Authentication required"): Response {
  return Response.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden"): Response {
  return Response.json({ error: message }, { status: 403 });
}

export async function requireAuth(
  request: Request,
  env: Env,
): Promise<AuthUser | Response> {
  const user = await getUserFromRequest(request, env);
  if (!user) return unauthorizedResponse();
  return user;
}
