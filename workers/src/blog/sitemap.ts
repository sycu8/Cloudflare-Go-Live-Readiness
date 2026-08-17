import type { Env } from "../types.js";
import { listPublishedPosts } from "./store.js";

const SITE = "https://ready.orangecloud.vn";

export type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

/** Static marketing + docs URLs always present in the sitemap. */
export const STATIC_SITEMAP_ENTRIES: SitemapEntry[] = [
  { loc: `${SITE}/`, changefreq: "weekly", priority: 1.0 },
  { loc: `${SITE}/blog/`, changefreq: "daily", priority: 0.9 },
  { loc: `${SITE}/app/`, changefreq: "weekly", priority: 0.9 },
  { loc: `${SITE}/docs/index.html`, changefreq: "monthly", priority: 0.85 },
  { loc: `${SITE}/docs/examples.html`, changefreq: "monthly", priority: 0.75 },
  { loc: `${SITE}/docs/web-agent.html`, changefreq: "monthly", priority: 0.75 },
  { loc: `${SITE}/docs/getting-started.html`, changefreq: "monthly", priority: 0.8 },
  { loc: `${SITE}/docs/commands.html`, changefreq: "monthly", priority: 0.8 },
  { loc: `${SITE}/docs/configuration.html`, changefreq: "monthly", priority: 0.7 },
  { loc: `${SITE}/docs/migration-readiness.html`, changefreq: "monthly", priority: 0.75 },
  { loc: `${SITE}/docs/security-readiness.html`, changefreq: "monthly", priority: 0.75 },
  { loc: `${SITE}/docs/ai-readiness.html`, changefreq: "monthly", priority: 0.75 },
  { loc: `${SITE}/docs/seo-readiness.html`, changefreq: "monthly", priority: 0.75 },
  { loc: `${SITE}/docs/reports.html`, changefreq: "monthly", priority: 0.7 },
  { loc: `${SITE}/docs/readiness-categories.html`, changefreq: "monthly", priority: 0.7 },
  { loc: `${SITE}/docs/github-action.html`, changefreq: "monthly", priority: 0.7 },
  { loc: `${SITE}/docs/roadmap.html`, changefreq: "monthly", priority: 0.6 },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toLastmod(iso: string): string | undefined {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

export function renderSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lines = [`    <loc>${escapeXml(entry.loc)}</loc>`];
      if (entry.lastmod) lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      if (typeof entry.priority === "number") {
        lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      }
      return `  <url>\n${lines.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export async function buildSitemapEntries(env: Env): Promise<SitemapEntry[]> {
  const entries = [...STATIC_SITEMAP_ENTRIES];
  try {
    const posts = await listPublishedPosts(env, 500);
    for (const post of posts) {
      entries.push({
        loc: `${SITE}/blog/${post.slug}/`,
        lastmod: toLastmod(post.published_at),
        changefreq: "monthly",
        priority: 0.7,
      });
    }
  } catch (err) {
    console.warn("Sitemap: failed to load blog posts", err);
  }
  return entries;
}

export async function handleSitemapRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (pathname !== "/sitemap.xml") return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const xml = renderSitemapXml(await buildSitemapEntries(env));
  const headers = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=3600",
  };
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(xml, { status: 200, headers });
}
