#!/usr/bin/env node
/**
 * Build a static sitemap.xml fallback (docs + known blog slugs from API or args).
 * Production prefers the Worker dynamic /sitemap.xml which includes live D1 posts.
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://ready.orangecloud.vn";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = resolve(root, "cf-ready-brandkit/seo/sitemap.xml");

const STATIC = [
  ["/", "weekly", "1.0"],
  ["/blog/", "daily", "0.9"],
  ["/app/", "weekly", "0.9"],
  ["/docs/index.html", "monthly", "0.85"],
  ["/docs/examples.html", "monthly", "0.75"],
  ["/docs/web-agent.html", "monthly", "0.75"],
  ["/docs/getting-started.html", "monthly", "0.8"],
  ["/docs/commands.html", "monthly", "0.8"],
  ["/docs/configuration.html", "monthly", "0.7"],
  ["/docs/migration-readiness.html", "monthly", "0.75"],
  ["/docs/security-readiness.html", "monthly", "0.75"],
  ["/docs/ai-readiness.html", "monthly", "0.75"],
  ["/docs/seo-readiness.html", "monthly", "0.75"],
  ["/docs/reports.html", "monthly", "0.7"],
  ["/docs/readiness-categories.html", "monthly", "0.7"],
  ["/docs/github-action.html", "monthly", "0.7"],
  ["/docs/roadmap.html", "monthly", "0.6"],
];

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc, changefreq, priority, lastmod) {
  const lines = [`    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
  lines.push(`    <changefreq>${changefreq}</changefreq>`);
  lines.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${lines.join("\n")}\n  </url>`;
}

async function fetchBlogPosts() {
  try {
    const res = await fetch(`${SITE}/api/blog`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.posts) ? data.posts : [];
  } catch {
    return [];
  }
}

const posts = await fetchBlogPosts();
const parts = STATIC.map(([path, freq, pri]) => urlEntry(`${SITE}${path}`, freq, pri));

for (const post of posts) {
  const lastmod = post.publishedAt ? String(post.publishedAt).slice(0, 10) : undefined;
  parts.push(urlEntry(`${SITE}/blog/${post.slug}/`, "monthly", "0.7", lastmod));
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${parts.join("\n")}\n</urlset>\n`;
writeFileSync(outPath, xml);
console.log(`Wrote ${outPath} (${STATIC.length} static + ${posts.length} blog URLs)`);
