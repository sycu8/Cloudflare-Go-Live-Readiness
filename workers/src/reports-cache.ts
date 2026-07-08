import type { Env } from "./types.js";

export type ReportCacheMeta = {
  contentHash: string;
  r2Key: string;
  generatedAt: string;
  commitSha?: string;
  format: "pdf";
};

export function reportR2Key(sessionId: string, contentHash: string): string {
  return `reports/${sessionId}/${contentHash}/cf-ready-report.pdf`;
}

export async function hashScanPayload(payload: unknown): Promise<string> {
  const json = JSON.stringify(payload);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

export async function getCachedPdf(
  env: Env,
  sessionId: string,
  contentHash: string,
): Promise<ArrayBuffer | null> {
  if (!env.UPLOADS) return null;
  const object = await env.UPLOADS.get(reportR2Key(sessionId, contentHash));
  return object ? object.arrayBuffer() : null;
}

export async function putCachedPdf(
  env: Env,
  sessionId: string,
  contentHash: string,
  bytes: Uint8Array,
  metadata: Record<string, string>,
): Promise<ReportCacheMeta> {
  if (!env.UPLOADS) {
    throw new Error("R2 bucket UPLOADS is not configured");
  }

  const r2Key = reportR2Key(sessionId, contentHash);
  await env.UPLOADS.put(r2Key, bytes, {
    httpMetadata: {
      contentType: "application/pdf",
      cacheControl: "private, max-age=31536000, immutable",
    },
    customMetadata: metadata,
  });

  return {
    contentHash,
    r2Key,
    generatedAt: new Date().toISOString(),
    commitSha: metadata.commitSha,
    format: "pdf",
  };
}

export async function registerGitHubRepoSession(
  env: Env,
  owner: string,
  repo: string,
  sessionId: string,
): Promise<void> {
  if (!env.SESSIONS) return;
  const key = `github:repo:${owner}/${repo}`;
  const existing = (await env.SESSIONS.get(key, "json")) as string[] | null;
  const next = new Set(existing ?? []);
  next.add(sessionId);
  await env.SESSIONS.put(key, JSON.stringify([...next]));
  await env.SESSIONS.put(
    `github:session:${sessionId}`,
    JSON.stringify({ owner, repo }),
  );
}

export async function listSessionsForRepo(
  env: Env,
  owner: string,
  repo: string,
): Promise<string[]> {
  if (!env.SESSIONS) return [];
  const existing = (await env.SESSIONS.get(`github:repo:${owner}/${repo}`, "json")) as
    | string[]
    | null;
  return existing ?? [];
}
