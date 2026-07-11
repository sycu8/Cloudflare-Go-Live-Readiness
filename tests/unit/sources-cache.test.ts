import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  githubSourceR2Key,
  uploadSourceR2Key,
  stageGithubTarballToR2,
  stageUploadZipToR2,
  hashBytes,
} from "../../workers/src/sources-cache.js";
import type { Env } from "../../workers/src/types.js";

function mockR2() {
  const objects = new Map<string, ArrayBuffer>();
  return {
    objects,
    head: vi.fn(async (key: string) => {
      const data = objects.get(key);
      if (!data) return null;
      return { size: data.byteLength, uploaded: new Date() };
    }),
    get: vi.fn(async (key: string) => {
      const data = objects.get(key);
      if (!data) return null;
      return {
        body: new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array(data));
            c.close();
          },
        }),
      };
    }),
    put: vi.fn(async (key: string, body: ArrayBuffer | ReadableStream) => {
      if (body instanceof ReadableStream) {
        const reader = body.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        const total = chunks.reduce((n, c) => n + c.length, 0);
        const buf = new Uint8Array(total);
        let offset = 0;
        for (const c of chunks) {
          buf.set(c, offset);
          offset += c.length;
        }
        objects.set(key, buf.buffer);
      } else {
        objects.set(key, body);
      }
    }),
  };
}

describe("sources-cache", () => {
  it("builds deterministic R2 keys", () => {
    expect(githubSourceR2Key("org", "repo", "abc123")).toBe(
      "sources/github/org/repo/abc123.tar.gz",
    );
    expect(uploadSourceR2Key("sess-1", "deadbeef")).toBe(
      "sources/uploads/sess-1/deadbeef.zip",
    );
  });

  it("hashBytes is stable length", async () => {
    const hash = await hashBytes(new TextEncoder().encode("hello").buffer);
    expect(hash).toHaveLength(24);
  });

  describe("stageGithubTarballToR2", () => {
    let r2: ReturnType<typeof mockR2>;
    let env: Env;

    beforeEach(() => {
      r2 = mockR2();
      env = { UPLOADS: r2 as unknown as R2Bucket } as Env;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
        ),
      );
    });

    it("downloads from GitHub when cache miss", async () => {
      const meta = await stageGithubTarballToR2(env, {
        owner: "org",
        repo: "repo",
        refOrSha: "sha1",
        tarballUrl: "https://codeload.github.com/org/repo/tar.gz/sha1",
      });
      expect(meta.r2Key).toContain("sources/github/org/repo/sha1");
      expect(r2.put).toHaveBeenCalled();
    });

    it("skips GitHub fetch on cache hit", async () => {
      const key = githubSourceR2Key("org", "repo", "sha1");
      r2.objects.set(key, new Uint8Array([9, 9]).buffer);
      const meta = await stageGithubTarballToR2(env, {
        owner: "org",
        repo: "repo",
        refOrSha: "sha1",
        tarballUrl: "https://example.com/miss",
      });
      expect(meta.bytes).toBe(2);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  it("stageUploadZipToR2 stores per-session zip", async () => {
    const r2 = mockR2();
    const env = { UPLOADS: r2 as unknown as R2Bucket } as Env;
    const data = new TextEncoder().encode("zip-bytes").buffer;
    const meta = await stageUploadZipToR2(env, "session-42", data);
    expect(meta.r2Key).toMatch(/^sources\/uploads\/session-42\//);
    expect(meta.format).toBe("zip");
    expect(r2.put).toHaveBeenCalled();
  });
});
