import type { Env } from "../types.js";
import type { AuthUser, ProviderProfile } from "./types.js";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
};

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
  };
}

export async function getUserById(env: Env, userId: string): Promise<AuthUser | null> {
  if (!env.DB) return null;
  const row = await env.DB.prepare(
    "SELECT id, email, name, avatar_url FROM users WHERE id = ?",
  )
    .bind(userId)
    .first<UserRow>();
  return row ? toAuthUser(row) : null;
}

export async function getUserProviders(
  env: Env,
  userId: string,
): Promise<Array<{ provider: string; providerUserId: string }>> {
  if (!env.DB) return [];
  const result = await env.DB.prepare(
    "SELECT provider, provider_user_id AS providerUserId FROM identities WHERE user_id = ?",
  )
    .bind(userId)
    .all<{ provider: string; providerUserId: string }>();
  return result.results ?? [];
}

export async function upsertUserFromProvider(
  env: Env,
  profile: ProviderProfile,
): Promise<AuthUser> {
  if (!env.DB) throw new Error("D1 database is not configured");
  const now = new Date().toISOString();

  const existingIdentity = await env.DB.prepare(
    "SELECT user_id FROM identities WHERE provider = ? AND provider_user_id = ?",
  )
    .bind(profile.provider, profile.providerUserId)
    .first<{ user_id: string }>();

  let userId = existingIdentity?.user_id;

  if (!userId) {
    const byEmail = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
      .bind(profile.email.toLowerCase())
      .first<{ id: string }>();
    userId = byEmail?.id;
  }

  if (!userId) {
    userId = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO users (id, email, name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(userId, profile.email.toLowerCase(), profile.name, profile.avatarUrl, now, now)
      .run();
  } else {
    await env.DB.prepare(
      "UPDATE users SET name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url), updated_at = ? WHERE id = ?",
    )
      .bind(profile.name, profile.avatarUrl, now, userId)
      .run();
  }

  const identityId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO identities (id, user_id, provider, provider_user_id, access_token, refresh_token, profile_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider, provider_user_id) DO UPDATE SET
       user_id = excluded.user_id,
       access_token = COALESCE(excluded.access_token, access_token),
       refresh_token = COALESCE(excluded.refresh_token, refresh_token),
       profile_json = excluded.profile_json`,
  )
    .bind(
      identityId,
      userId,
      profile.provider,
      profile.providerUserId,
      profile.accessToken ?? null,
      profile.refreshToken ?? null,
      profile.profileJson ?? null,
      now,
    )
    .run();

  if (profile.provider === "github" && profile.accessToken && env.SESSIONS) {
    await env.SESSIONS.put(`github:user:${userId}`, profile.accessToken, {
      expirationTtl: 60 * 60 * 8,
    });
  }

  const user = await getUserById(env, userId);
  if (!user) throw new Error("Failed to load user after upsert");
  return user;
}

export async function storeGitHubTokenForUser(
  env: Env,
  userId: string,
  accessToken: string,
  workspaceSessionId?: string,
): Promise<void> {
  if (env.SESSIONS) {
    await env.SESSIONS.put(`github:user:${userId}`, accessToken, {
      expirationTtl: 60 * 60 * 8,
    });
    if (workspaceSessionId) {
      await env.SESSIONS.put(`github:${workspaceSessionId}`, accessToken, {
        expirationTtl: 60 * 60 * 8,
      });
    }
  }

  if (!env.DB) return;
  await env.DB.prepare(
    "UPDATE identities SET access_token = ? WHERE user_id = ? AND provider = 'github'",
  )
    .bind(accessToken, userId)
    .run();
}
