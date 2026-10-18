# Changelog

## 0.3.3 — 2026-10-18

### AI Blog (Workers AI)

- New `/blog/` section with SEO-friendly SSR pages and JSON API (`/api/blog`)
- Cron (`0 10 * * *`) publishes one post per day when ≥1 day has passed since the last post
- Workers AI generates ≥300-word polite/professional posts + R2 hero images
- Topic rotation: Cloudflare platform, CF Ready overview, howto, SEO, AI readiness, fair platform comparison
- D1 migration `migrations/d1/0002_blog.sql`; see `DEPLOY.md` for apply + seed steps
- `POST /api/blog/generate` accepts `{ "seedAll": true }` to publish one article per topic for the initial backlog
- D1 migration `migrations/d1/0003_blog_seed.sql` publishes four editorial posts for the first backlog topics (platform, overview, howto, SEO). The daily cron continues at AI readiness

### SEO

- Dynamic `/sitemap.xml` lists static site and docs URLs plus every published blog post (`lastmod`, priority)
- Static sitemap fallback is refreshed by `npm run build:sitemap` (wired into `build:web`)

### Docs

- Site footer attribution is `Made by Lê Sỹ Cường · OrangeCloud` on the homepage, blog index, and SSR blog pages

## 0.3.2 — 2026-08-07

### Phase 5 start — Deployment assistant

- Deep **Wrangler config validation** (name, compatibility_date, main/pages assets, stale dates)
- New report: `post-deploy-checklist.md` (smoke-test + rollback reminders + AI prompt)
- Fixture: `tests/fixtures/wrangler-app`

### Phase 3 — Safe fix Action

- New composite action: `action/fix` (`cf-ready fix --create-pr`)
- Example workflow: `examples/github-action-safe-fix.yml`

## 0.3.1 — 2026-08-06

### Customer reports — fix guidance + AI prompts

- Every actionable finding now includes **How to fix** steps in markdown / checklist / Web Agent
- Copy-paste **AI agent prompts** for Cursor, Claude, ChatGPT, Copilot, etc. (offline, no API)
- New report: `cf-ready-ai-fix-prompts.md` (batch + per-finding prompts)
- JSON report adds `agentPrompt`, `fixSteps`, and top-level `aiFixPrompts`
- Web Agent Results: **Copy AI fix prompt** button per finding
- PDF notes where to find full prompts

## 0.3.0 — 2026-08-06

### Framework adapters

- Deep migration analyzers for **Astro**, **Remix**, and **Hono** (replacing detection-only stubs)
- Add `hono` to the framework schema; prefer Astro/Remix/Hono detection before generic Vite/Node
- Route detection for Astro `src/pages`, Remix `app/routes`, and Hono HTTP methods
- Remediation templates with Cloudflare docs URLs for Astro, Remix, and Hono
- Fixtures: `tests/fixtures/astro-app`, `remix-app`, `hono-app`

### GitHub Action

- Default **`install-from: npm`** — consumers run `npx @orangecloud/cf-ready` without vendoring source
- `install-from: source` + `cf-ready-root` for dogfood / monorepo builds
- `package-version` input (default `0.3.0`)
- Action README: Marketplace tags, external workflow snippet, branch-protection steps

### Fix command

- `cf-ready fix --create-pr` opens a branch/PR with safe AI/SEO assets only (`--dry-run` supported)
- Requires `git` + GitHub CLI (`gh`) for non-dry-run

## 0.2.1 — 2026-07-11

### Web Agent

- Extend exec wait timeout to **30 minutes** (client + Durable Object poll + sandbox exec aligned)
- Skip redundant module sandbox prewarm on parallel rescans; raise module concurrency to 3
- Shared timeout constants in `src/shared/exec-timeouts.ts`

### CI / platform

- Fix Windows CI scan output path (`RUNNER_TEMP` instead of `/tmp`)
- ImgBot-optimized docs assets (~28% smaller)
- E2E production workflow skips gracefully when edge returns 403 to GitHub Actions runners

## 0.2.0 — 2026-07-10

### Accuracy and evidence

- Structured `evidenceItems` (file, line, snippet) on migration blockers and secret findings
- Per-package npm audit findings with CVE/advisory evidence
- Confidence-weighted scoring with capped non-blocker deductions
- Cross-module dedupe (SEO owns robots.txt / sitemap.xml)
- Config `baseline.ignoredFindingIds` / `acceptedRiskIds`

### Reports and remediation

- `remediation` object on findings (steps, docs URL, cf-ready command, wrangler snippet)
- Markdown reports: evidence tables, remediation steps, full finding list
- PDF and SARIF include evidence and remediation help text
- Web Agent Results cards show evidence, recommendation, and fix commands
- `cf-ready fix --finding <id>` and `--rescan` after fix
- Smoke-test findings merged when `productionUrl` is set in config

### Platform

- Windows EPERM fix (`projectGlob`, project root validation)
- CI: Windows job, `validate:npm`, `test:qa:cli`, `build:all` typecheck
- npm publish NPM_TOKEN preflight
- Web Agent allows `fix` command
- GitHub PR comments include blockers, evidence, and fix suggestions

## 0.1.1 — 2026-07-10

- Windows scan fix for `Application Data` junction folders
- Project root validation before scan

## 0.1.0 — 2026-07-10

- Initial public release on npm (`@orangecloud/cf-ready`)
