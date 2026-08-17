import { describe, expect, it } from "vitest";
import {
  STATIC_SITEMAP_ENTRIES,
  renderSitemapXml,
} from "../../workers/src/blog/sitemap.js";

describe("sitemap", () => {
  it("includes core static routes", () => {
    const locs = STATIC_SITEMAP_ENTRIES.map((e) => e.loc);
    expect(locs).toContain("https://ready.orangecloud.vn/");
    expect(locs).toContain("https://ready.orangecloud.vn/blog/");
    expect(locs).toContain("https://ready.orangecloud.vn/docs/getting-started.html");
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
});
