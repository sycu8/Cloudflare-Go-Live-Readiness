import type { Env } from "../types.js";
import type { AuthUser } from "./types.js";
import { getUserById } from "./users.js";

export const AUTH_COOKIE = "cf_ready_auth";
const AUTH_SESSION_DAYS = 30;

export function parseAuthCookie(request: Request): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === AUTH_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function authCookieHeader(sessionId: string): string {
  const maxAge = AUTH_SESSION_DAYS * 24 * 60 * 60;
  return `${AUTH_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearAuthCookieHeader(): string {
  return `${AUTH_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createAuthSession(env: Env, userId: string): Promise<string> {
  if (!env.DB) throw new Error("D1 database is not configured");
  const id = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + AUTH_SESSION_DAYS * 24 * 60 * 60 * 1000);
  await env.DB.prepare(
    "INSERT INTO auth_sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(id, userId, expires.toISOString(), now.toISOString())
    .run();
  return id;
}

export async function deleteAuthSession(env: Env, sessionId: string): Promise<void> {
  if (!env.DB) return;
  await env.DB.prepare("DELETE FROM auth_sessions WHERE id = ?").bind(sessionId).run();
}

export async function getUserFromRequest(
  request: Request,
  env: Env,
): Promise<AuthUser | null> {
  const authSessionId = parseAuthCookie(request);
  if (!authSessionId || !env.DB) return null;

  const row = await env.DB.prepare(
    "SELECT user_id, expires_at FROM auth_sessions WHERE id = ?",
  )
    .bind(authSessionId)
    .first<{ user_id: string; expires_at: string }>();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await deleteAuthSession(env, authSessionId);
    return null;
  }

  return getUserById(env, row.user_id);
}

export async function linkWorkspaceSession(
  env: Env,
  userId: string,
  workspaceSessionId: string,
): Promise<void> {
  if (!env.DB) throw new Error("D1 database is not configured");
  await env.DB.prepare(
    "INSERT OR REPLACE INTO workspace_sessions (session_id, user_id, created_at) VALUES (?, ?, ?)",
  )
    .bind(workspaceSessionId, userId, new Date().toISOString())
    .run();
}

export async function assertWorkspaceSessionOwner(
  env: Env,
  userId: string,
  workspaceSessionId: string,
): Promise<boolean> {
  if (!env.DB) return false;
  const row = await env.DB.prepare(
    "SELECT 1 AS ok FROM workspace_sessions WHERE session_id = ? AND user_id = ?",
  )
    .bind(workspaceSessionId, userId)
    .first<{ ok: number }>();
  return Boolean(row?.ok);
}
