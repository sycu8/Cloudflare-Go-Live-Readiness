## AI Blog (Workers AI)

- New `/blog/` section with SEO-friendly SSR pages and JSON API (`/api/blog`)
- Cron (`0 10 * * *`) publishes one post per day when ≥1 day has passed since the last post
- Workers AI generates ≥300-word polite/professional articles + R2 hero images
- Topic rotation: Cloudflare platform, CF Ready overview, howto, SEO, AI readiness, fair platform comparison
- D1 migration: `migrations/d1/0002_blog.sql` (apply with `wrangler d1 migrations apply cf-ready --remote`)
- `POST /api/blog/generate` `{ "seedAll": true }` publishes one article per topic for the initial backlog

## SEO

- Dynamic `/sitemap.xml` includes static site/docs URLs and every published blog post
- Static fallback refreshed via `npm run build:sitemap` (also runs as part of `build:web`)

## Docs

- Footer attribution is `Made by Lê Sỹ Cường · OrangeCloud` (homepage, blog index, SSR blog pages)

**Site:** https://ready.orangecloud.vn/blog/  
**Install:** `npm install -g @orangecloud/cf-ready@0.3.3`
