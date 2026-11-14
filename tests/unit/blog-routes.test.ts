import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Env } from "../../workers/src/types.js";
import type { BlogPostRow } from "../../workers/src/blog/store.js";

vi.mock("@cloudflare/sandbox", () => ({
  Sandbox: class Sandbox {},
  getSandbox() {
    throw new Error("sandbox is not used when serving the blog");
  },
}));

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

type WorkerFetch = (request: Request, env: Env) => Promise<Response>;

let workerFetch: WorkerFetch;

beforeAll(async () => {
  const worker = await import("../../workers/src/index.js");
  workerFetch = worker.default.fetch;
});

const LITERAL = "${escapeHtml(p.title)}";

const row: BlogPostRow = {
  id: "post-1",
  slug: "workers-static-assets",
  topic_id: "what-is-cloudflare",
  title: 'Workers static assets & "quotes"',
  excerpt: "Ship the build on Workers.",
  body_markdown: "Body",
  body_html: "<p>Body</p>",
  meta_description: "Static assets on Workers.",
  keywords: '["Workers"]',
  image_r2_key: null,
  image_alt: null,
  word_count: 320,
  status: "published",
  model_text: null,
  model_image: null,
  published_at: "2026-11-14T00:00:00.000Z",
  created_at: "2026-11-14T00:00:00.000Z",
  updated_at: "2026-11-14T00:00:00.000Z",
};

/** D1 stub: schema bootstrap is a no-op; the posts query returns the fixture row. */
function envWithPosts(posts: BlogPostRow[], assetBody: string): Env {
  const db = {
    prepare(sql: string) {
      const stmt = {
        bind() {
          return stmt;
        },
        async all() {
          return { results: sql.includes("FROM blog_posts") ? posts : [] };
        },
        async first() {
          return null;
        },
        async run() {
          return { success: true };
        },
      };
      return stmt;
    },
    async batch() {
      return [];
    },
  };
  return {
    DB: db,
    ASSETS: {
      fetch: async () =>
        new Response(assetBody, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    },
  } as unknown as Env;
}

describe("blog index and API", () => {
  it("does not ship the uninterpolated title expression in the static shell", () => {
    const html = readFileSync(path.join(root, "docs/blog/index.html"), "utf8");
    expect(html).not.toContain(LITERAL);
    expect(html).not.toContain("${escapeHtml(p.slug)}");
    expect(html).not.toContain('fetch("/api/blog")');
  });

  it("renders stored titles and ignores a static shell that still contains the template", async () => {
    const env = envWithPosts([row], `<h2>${LITERAL}</h2><h2>${LITERAL}</h2><h2>${LITERAL}</h2>`);
    const response = await workerFetch(new Request("https://ready.orangecloud.vn/blog/"), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(response.headers.get("X-Robots-Tag")).toBeNull();
    const html = await response.text();
    expect(html).toContain("Workers static assets &amp; &quot;quotes&quot;");
    expect(html).toContain('href="/blog/workers-static-assets/"');
    expect(html).not.toContain(LITERAL);
    expect(html).not.toContain("${escapeHtml(p.slug)}");
  });

  it("returns JSON from /api/blog when the asset layer would serve the HTML 404", async () => {
    const env = envWithPosts([row], "<title>Page not found — CF Ready</title>");
    env.ASSETS = {
      fetch: async () =>
        new Response("<title>Page not found — CF Ready</title>", {
          status: 404,
          headers: { "Content-Type": "text/html" },
        }),
    };
    const response = await workerFetch(new Request("https://ready.orangecloud.vn/api/blog"), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    const body = (await response.json()) as { posts: Array<{ title: string; slug: string }> };
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0]?.title).toBe(row.title);
    expect(body.posts[0]?.slug).toBe(row.slug);
    expect(JSON.stringify(body)).not.toContain(LITERAL);
  });

  it("returns an empty JSON list when D1 is not bound", async () => {
    const env = {
      ASSETS: {
        fetch: async () => new Response("404 page", { status: 404 }),
      },
    } as Env;
    const response = await workerFetch(new Request("https://ready.orangecloud.vn/api/blog"), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    const body = (await response.json()) as { posts: unknown[]; topics: unknown[] };
    expect(body.posts).toEqual([]);
    expect(body.topics.length).toBeGreaterThan(0);
  });
});
