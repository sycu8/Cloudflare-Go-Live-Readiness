import type { BlogPostPublic } from "./store.js";
import { BLOG_TOPICS } from "./topics.js";

const SITE = "https://ready.orangecloud.vn";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function topicLabel(topicId: string): string {
  return BLOG_TOPICS.find((t) => t.id === topicId)?.label ?? topicId;
}

function shell(opts: {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string | null;
  body: string;
  jsonLd?: unknown;
}): string {
  const ogImage = opts.ogImage || `${SITE}/assets/og.svg`;
  const jsonLd = opts.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(opts.jsonLd)}</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${escapeHtml(opts.title)}</title>
    <meta name="description" content="${escapeHtml(opts.description)}" />
    <link rel="canonical" href="${escapeHtml(opts.canonical)}" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#0F172A" />
    <script src="/assets/theme.js"></script>
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(opts.canonical)}" />
    <meta property="og:title" content="${escapeHtml(opts.title)}" />
    <meta property="og:description" content="${escapeHtml(opts.description)}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(opts.title)}" />
    <meta name="twitter:description" content="${escapeHtml(opts.description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/site.css" />
    ${jsonLd}
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="header-inner">
        <a class="logo" href="/">
          <img class="logo-mark" src="/assets/logo-icon.svg" alt="" width="36" height="36" decoding="async" />
          <span class="logo-text">
            <strong>CF Ready</strong>
            <span>Cloudflare Go-Live Readiness</span>
          </span>
        </a>
        <nav class="nav-links header-actions" aria-label="Main">
          <a href="/blog/" class="active">Blog</a>
          <a href="/docs/index.html" class="hide-mobile">Docs</a>
          <a href="/app/" class="btn btn-primary header-cta">Web Agent</a>
        </nav>
      </div>
    </header>
    <main id="main">
      ${opts.body}
    </main>
    <footer class="site-footer">
      <div class="footer-inner">
        <div>
          <strong style="color:var(--cf-text-inverse)">CF Ready</strong>
          <p style="margin:0.35rem 0 0">Made by Lê Sỹ Cường &amp; Trịnh Hoàng Tú · OrangeCloud</p>
          <p style="margin:0.35rem 0 0;font-size:0.8rem">Community open-source tool; not affiliated with Cloudflare, Inc.</p>
        </div>
        <div>
          <a href="https://github.com/sycu8/Cloudflare-Go-Live-Readiness">GitHub</a>
          ·
          <a href="/blog/">Blog</a>
          ·
          <a href="/docs/index.html">Docs</a>
          ·
          <a href="/llms.txt">llms.txt</a>
        </div>
      </div>
    </footer>
    <script src="/assets/site-mobile.js" defer></script>
  </body>
</html>`;
}

export function renderBlogIndex(posts: BlogPostPublic[]): string {
  const cards =
    posts.length === 0
      ? `<p class="blog-empty">New articles are generated every 3 days with Workers AI. Check back soon, or trigger a draft after deploy.</p>`
      : `<div class="blog-grid">${posts
          .map(
            (p) => `
        <article class="blog-card">
          <a class="blog-card__link" href="/blog/${escapeHtml(p.slug)}/">
            ${
              p.imageUrl
                ? `<img class="blog-card__image" src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.imageAlt || p.title)}" loading="lazy" width="640" height="360" />`
                : `<div class="blog-card__image blog-card__image--placeholder" aria-hidden="true"></div>`
            }
            <div class="blog-card__body">
              <p class="blog-card__meta"><span class="blog-topic">${escapeHtml(topicLabel(p.topicId))}</span> · <time datetime="${escapeHtml(p.publishedAt)}">${escapeHtml(formatDate(p.publishedAt))}</time></p>
              <h2 class="blog-card__title">${escapeHtml(p.title)}</h2>
              <p class="blog-card__excerpt">${escapeHtml(p.excerpt)}</p>
            </div>
          </a>
        </article>`,
          )
          .join("")}</div>`;

  const body = `
    <section class="blog-hero">
      <div class="blog-hero__inner">
        <p class="blog-kicker">CF Ready Blog</p>
        <h1>Guides for Cloudflare-ready shipping</h1>
        <p class="blog-lead">Practical articles on the Cloudflare Developer Platform, CF Ready workflows, SEO, and AI readiness — generated with Workers AI every three days.</p>
      </div>
    </section>
    <section class="blog-list">
      <div class="blog-list__inner">
        ${cards}
      </div>
    </section>`;

  return shell({
    title: "CF Ready Blog — Cloudflare readiness guides",
    description:
      "SEO-friendly guides on Cloudflare, CF Ready, SEO optimization, and AI readiness. New posts every 3 days via Workers AI.",
    canonical: `${SITE}/blog/`,
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "CF Ready Blog",
      url: `${SITE}/blog/`,
      description:
        "Guides on Cloudflare Developer Platform readiness, SEO, and AI — by OrangeCloud.",
      publisher: { "@type": "Organization", name: "OrangeCloud", url: SITE },
    },
  });
}

export function renderBlogPost(post: BlogPostPublic): string {
  const canonical = `${SITE}/blog/${post.slug}/`;
  const body = `
    <article class="blog-post">
      <header class="blog-post__header">
        <p class="blog-kicker"><a href="/blog/">Blog</a> · ${escapeHtml(topicLabel(post.topicId))}</p>
        <h1>${escapeHtml(post.title)}</h1>
        <p class="blog-post__meta">
          <time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(formatDate(post.publishedAt))}</time>
          · ${post.wordCount} words
        </p>
        <p class="blog-post__excerpt">${escapeHtml(post.excerpt)}</p>
      </header>
      ${
        post.imageUrl
          ? `<figure class="blog-post__figure">
              <img src="${escapeHtml(post.imageUrl)}" alt="${escapeHtml(post.imageAlt || post.title)}" width="1200" height="630" />
            </figure>`
          : ""
      }
      <div class="blog-post__content">
        ${post.bodyHtml}
      </div>
      <aside class="blog-post__cta">
        <h2>Try CF Ready</h2>
        <p>Scan your repo for migration, security, AI, SEO, and deployment readiness before you go live on Cloudflare.</p>
        <p>
          <a class="btn btn-primary" href="/app/">Open Web Agent</a>
          <a class="btn btn-ghost" href="/docs/getting-started.html">Read docs</a>
        </p>
      </aside>
    </article>`;

  return shell({
    title: `${post.title} | CF Ready Blog`,
    description: post.metaDescription,
    canonical,
    ogImage: post.imageUrl,
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.metaDescription,
      datePublished: post.publishedAt,
      image: post.imageUrl ? [post.imageUrl] : undefined,
      keywords: post.keywords.join(", "),
      author: { "@type": "Organization", name: "OrangeCloud" },
      publisher: {
        "@type": "Organization",
        name: "OrangeCloud",
        url: SITE,
        logo: { "@type": "ImageObject", url: `${SITE}/assets/logo-icon.svg` },
      },
      mainEntityOfPage: canonical,
      wordCount: post.wordCount,
    },
  });
}

export function renderBlogNotFound(slug: string): string {
  const body = `
    <section class="blog-hero">
      <div class="blog-hero__inner">
        <p class="blog-kicker"><a href="/blog/">Blog</a></p>
        <h1>Article not found</h1>
        <p class="blog-lead">We could not find <code>${escapeHtml(slug)}</code>. Browse the latest guides or check back after the next Workers AI publish cycle.</p>
        <p style="margin-top:1.25rem"><a class="btn btn-primary" href="/blog/">Back to blog</a></p>
      </div>
    </section>`;

  return shell({
    title: "Article not found | CF Ready Blog",
    description: "The requested CF Ready blog article could not be found.",
    canonical: `${SITE}/blog/`,
    body,
  });
}

export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": status === 404 ? "no-store" : "public, max-age=60, s-maxage=300",
    },
  });
}
