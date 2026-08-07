## AI Blog (Workers AI)

- New `/blog/` section with SEO-friendly SSR pages and JSON API (`/api/blog`)
- Cron publishes when ≥3 days have passed since the last post
- Workers AI generates ≥300-word polite/professional articles + R2 hero images
- Topic rotation: Cloudflare platform, CF Ready overview, howto, SEO, AI readiness, fair platform comparison
- D1 migration: `migrations/d1/0002_blog.sql` (apply with `wrangler d1 migrations apply cf-ready --remote`)

**Site:** https://ready.orangecloud.vn/blog/  
**Install:** `npm install -g @orangecloud/cf-ready@0.3.3`
