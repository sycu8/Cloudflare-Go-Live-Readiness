import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  STATIC_SITEMAP_ENTRIES,
  buildSitemapEntries,
  handleSitemapRequest,
  renderSitemapXml,
} from "../../workers/src/blog/sitemap.js";
import type { BlogPostRow } from "../../workers/src/blog/store.js";
import type { Env } from "../../workers/src/types.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("sitemap", () => {
  it("includes core static routes", () => {
    const locs = STATIC_SITEMAP_ENTRIES.map((e) => e.loc);
    expect(locs).toContain("https://ready.orangecloud.vn/");
    expect(locs).toContain("https://ready.orangecloud.vn/blog/");
    expect(locs).toContain("https://ready.orangecloud.vn/docs/getting-started");
    expect(locs).toContain("https://ready.orangecloud.vn/docs/");
    expect(locs.some((loc) => loc.endsWith(".html"))).toBe(false);
  });

  it("renders valid xml with blog posts and lastmod", () => {
    const xml = renderSitemapXml([
      ...STATIC_SITEMAP_ENTRIES.slice(0, 2),
      {
        loc: "https://ready.orangecloud.vn/blog/example-post-2026-08-07/",
        lastmod: "2026-08-07",
        changefreq: "monthly",
        priority: 0.7,
      },
    ]);

    expect(xml.startsWith("<?xml version=\"1.0\"")).toBe(true);
    expect(xml).toContain("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
    expect(xml).toContain("<loc>https://ready.orangecloud.vn/blog/example-post-2026-08-07/</loc>");
    expect(xml).toContain("<lastmod>2026-08-07</lastmod>");
    expect(xml).toContain("<priority>0.7</priority>");
  });

  it("escapes xml special characters in locs", () => {
    const xml = renderSitemapXml([
      { loc: "https://ready.orangecloud.vn/blog/a&b/", priority: 0.5 },
    ]);
    expect(xml).toContain("a&amp;b");
    expect(xml).not.toContain("<loc>https://ready.orangecloud.vn/blog/a&b/</loc>");
  });

  it("includes every published post with a trailing slash and updated lastmod", async () => {
    const rows = [
      post({
        slug: "workers-static-assets",
        published_at: "2026-08-07T00:00:00.000Z",
        updated_at: "2026-11-14T12:00:00.000Z",
      }),
      post({
        slug: "a&b",
        published_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      }),
    ];
    const response = await handleSitemapRequest(
      new Request("https://ready.orangecloud.vn/sitemap.xml"),
      envWith(rows),
    );
    expect(response?.status).toBe(200);
    expect(response?.headers.get("Content-Type")).toContain("application/xml");
    const xml = await response!.text();
    expect(isWellFormedSitemap(xml, STATIC_SITEMAP_ENTRIES.length + rows.length)).toBe(true);
    expect(xml).toContain("<loc>https://ready.orangecloud.vn/blog/workers-static-assets/</loc>");
    expect(xml).toContain("<lastmod>2026-11-14</lastmod>");
    expect(xml).not.toContain("<lastmod>2026-08-07</lastmod>");
    expect(xml).toContain("<loc>https://ready.orangecloud.vn/blog/a&amp;b/</loc>");
    expect(xml).not.toContain("<loc>https://ready.orangecloud.vn/blog/a&b/</loc>");
  });

  it("uses the published date when updated_at is missing", async () => {
    const entries = await buildSitemapEntries(
      envWith([
        post({
          slug: "published-only",
          published_at: "2026-10-02T00:00:00.000Z",
          updated_at: "",
        }),
      ]),
    );
    const entry = entries.find((item) => item.loc.endsWith("/blog/published-only/"));
    expect(entry?.lastmod).toBe("2026-10-02");
  });

  it("falls back to static pages when D1 is unbound", async () => {
    const entries = await buildSitemapEntries({} as Env);
    expect(entries).toEqual(STATIC_SITEMAP_ENTRIES);
    const response = await handleSitemapRequest(
      new Request("https://ready.orangecloud.vn/sitemap.xml"),
      {} as Env,
    );
    const xml = await response!.text();
    expect(isWellFormedSitemap(xml, STATIC_SITEMAP_ENTRIES.length)).toBe(true);
    expect(xml).toContain("<loc>https://ready.orangecloud.vn/blog/</loc>");
    expect(xml).not.toContain("/blog/workers-static-assets/");
  });

  it("keeps robots.txt pointing at the sitemap", () => {
    const robots = readFileSync(path.join(root, "cf-ready-brandkit/seo/robots.txt"), "utf8");
    expect(robots).toContain("Sitemap: https://ready.orangecloud.vn/sitemap.xml");
  });
});

function isWellFormedSitemap(xml: string, urlCount: number): boolean {
  if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) return false;
  if (!xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) return false;
  if (!xml.trimEnd().endsWith("</urlset>")) return false;
  if ((xml.match(/<url>/g) ?? []).length !== urlCount) return false;
  if ((xml.match(/<\/url>/g) ?? []).length !== urlCount) return false;
  if ((xml.match(/<loc>/g) ?? []).length !== urlCount) return false;
  if (/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml)) return false;
  return true;
}

function envWith(rows: BlogPostRow[]): Env {
  const db = {
    prepare(sql: string) {
      const stmt = {
        bind() {
          return stmt;
        },
        async all() {
          return { results: sql.includes("FROM blog_posts") ? rows : [] };
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
  return { DB: db } as unknown as Env;
}

function post(overrides: Partial<BlogPostRow> & Pick<BlogPostRow, "slug" | "published_at">): BlogPostRow {
  return {
    id: overrides.slug,
    slug: overrides.slug,
    topic_id: "what-is-cloudflare",
    title: overrides.slug,
    excerpt: "Excerpt",
    body_markdown: "Body",
    body_html: "<p>Body</p>",
    meta_description: "Meta",
    keywords: null,
    image_r2_key: null,
    image_alt: null,
    word_count: 300,
    status: "published",
    model_text: null,
    model_image: null,
    published_at: overrides.published_at,
    created_at: overrides.published_at,
    updated_at: overrides.updated_at ?? overrides.published_at,
  };
}
