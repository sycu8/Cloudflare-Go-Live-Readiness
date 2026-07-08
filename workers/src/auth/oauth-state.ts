import type { Env } from "../types.js";
import type { OAuthStatePayload } from "./types.js";

const STATE_TTL_SECONDS = 600;

export async function createOAuthState(env: Env, payload: OAuthStatePayload): Promise<string> {
  if (!env.SESSIONS) throw new Error("KV SESSIONS binding is required for OAuth");
  const id = crypto.randomUUID();
  await env.SESSIONS.put(`oauth:${id}`, JSON.stringify(payload), {
    expirationTtl: STATE_TTL_SECONDS,
  });
  return id;
}

export async function consumeOAuthState(
  env: Env,
  stateId: string,
): Promise<OAuthStatePayload | null> {
  if (!env.SESSIONS) return null;
  const key = `oauth:${stateId}`;
  const raw = await env.SESSIONS.get(key);
  if (!raw) return null;
  await env.SESSIONS.delete(key);
  try {
    return JSON.parse(raw) as OAuthStatePayload;
  } catch {
    return null;
  }
}
