import type { Env } from "./types.js";

export type SourceArchiveFormat = "tar.gz" | "zip";

export type SourceMeta = {
  r2Key: string;
  format: SourceArchiveFormat;
  owner?: string;
  repo?: string;
  commitSha?: string;
  ref?: string;
  uploadedAt: string;
  bytes?: number;
};

/** Shared GitHub tarball cache keyed by commit SHA (or ref fallback). */
export function githubSourceR2Key(owner: string, repo: string, refOrSha: string): string {
  const safe = refOrSha.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `sources/github/${owner}/${repo}/${safe}.tar.gz`;
}

/** Per-session ZIP upload archive. */
export function uploadSourceR2Key(sessionId: string, contentHash: string): string {
  return `sources/uploads/${sessionId}/${contentHash}.zip`;
}

export async function hashBytes(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

export async function headSourceObject(env: Env, r2Key: string): Promise<boolean> {
  if (!env.UPLOADS) return false;
  const head = await env.UPLOADS.head(r2Key);
  return head !== null;
}

/**
 * Import plane: fetch GitHub tarball in Worker/DO and stage to R2.
 * Skips download when the same key already exists (commit cache hit).
 */
export async function stageGithubTarballToR2(
  env: Env,
  args: {
    owner: string;
    repo: string;
    refOrSha: string;
    tarballUrl: string;
    token?: string;
  },
): Promise<SourceMeta> {
  if (!env.UPLOADS) {
    throw new Error("R2 bucket UPLOADS is not configured for source staging");
  }

  const r2Key = githubSourceR2Key(args.owner, args.repo, args.refOrSha);
  const existing = await env.UPLOADS.head(r2Key);
  if (existing) {
    return {
      r2Key,
      format: "tar.gz",
      owner: args.owner,
      repo: args.repo,
      commitSha: args.refOrSha.length === 40 ? args.refOrSha : undefined,
      ref: args.refOrSha,
      uploadedAt: existing.uploaded.toISOString(),
      bytes: existing.size,
    };
  }

  const headers: Record<string, string> = { "User-Agent": "cf-ready-agent" };
  if (args.token) headers.Authorization = `Bearer ${args.token}`;

  const response = await fetch(args.tarballUrl, { headers, redirect: "follow" });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (response.status === 404 || text.includes("Not Found")) {
      throw new Error(
        "GitHub archive not found. For private repos, connect GitHub or check repository access.",
      );
    }
    throw new Error(`GitHub archive download failed (${response.status})`);
  }
  if (!response.body) {
    throw new Error("GitHub returned an empty archive response");
  }

  await env.UPLOADS.put(r2Key, response.body, {
    httpMetadata: {
      contentType: "application/gzip",
      cacheControl: "private, max-age=31536000, immutable",
    },
    customMetadata: {
      owner: args.owner,
      repo: args.repo,
      refOrSha: args.refOrSha,
      source: "github",
    },
  });

  const head = await env.UPLOADS.head(r2Key);
  return {
    r2Key,
    format: "tar.gz",
    owner: args.owner,
    repo: args.repo,
    commitSha: args.refOrSha.length === 40 ? args.refOrSha : undefined,
    ref: args.refOrSha,
    uploadedAt: new Date().toISOString(),
    bytes: head?.size,
  };
}

/** Stage uploaded ZIP to R2 before sandbox extraction. */
export async function stageUploadZipToR2(
  env: Env,
  sessionId: string,
  data: ArrayBuffer,
): Promise<SourceMeta> {
  if (!env.UPLOADS) {
    throw new Error("R2 bucket UPLOADS is not configured for source staging");
  }

  const contentHash = await hashBytes(data);
  const r2Key = uploadSourceR2Key(sessionId, contentHash);

  await env.UPLOADS.put(r2Key, data, {
    httpMetadata: {
      contentType: "application/zip",
      cacheControl: "private, max-age=604800",
    },
    customMetadata: {
      sessionId,
      source: "upload",
      contentHash,
    },
  });

  return {
    r2Key,
    format: "zip",
    uploadedAt: new Date().toISOString(),
    bytes: data.byteLength,
  };
}

export async function readSourceBytes(env: Env, r2Key: string): Promise<Uint8Array> {
  if (!env.UPLOADS) throw new Error("R2 bucket UPLOADS is not configured");
  const object = await env.UPLOADS.get(r2Key);
  if (!object) {
    throw new Error("Source archive missing from R2. Re-import the project.");
  }
  return new Uint8Array(await object.arrayBuffer());
}

/** @deprecated Prefer readSourceBytes — Sandbox writeFile needs known-length body. */
export async function readSourceStream(
  env: Env,
  r2Key: string,
): Promise<ReadableStream<Uint8Array>> {
  const bytes = await readSourceBytes(env, r2Key);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
