# CF Ready Roadmap

Living roadmap for [CF Ready](https://ready.orangecloud.vn) (`@orangecloud/cf-ready`). See also the [README Roadmap](README.md#roadmap) for the original five-phase vision.

## Shipped (v0.1)

- Production CLI: scan, inspect, security, AI/SEO readiness, reports, smoke-test
- Marketing site + docs at [ready.orangecloud.vn](https://ready.orangecloud.vn)
- Web Agent MVP at [/app/](https://ready.orangecloud.vn/app/)
- Cloudflare Worker deploy (Sandbox, Session DO, R2/KV)
- GitHub OAuth scaffold for private repos

## In progress (v0.2)

| Item | Status | Notes |
|------|--------|-------|
| npm publish `@orangecloud/cf-ready` | Ready | Add `NPM_TOKEN` secret; publish on GitHub Release or tag `v*` |
| GitHub Action (PR readiness) | Shipped | [`action/action.yml`](action/action.yml), [docs](docs/docs/github-action.html) |
| Private repo import UI | Shipped | Web Agent repo picker + OAuth token import |
| OG / SEO polish | Shipped | `docs/assets/og.png`, meta on doc pages |
| Framework adapters (Astro, Remix, Hono) | Planned | Detection only today |

## Phase 2 — GitHub Action (README)

- [x] Composite action: scan, SARIF upload, artifacts
- [x] Dogfood workflow on PRs (`.github/workflows/cf-ready-pr.yml`)
- [ ] Publish action to Marketplace / version tags
- [ ] Block merges on blockers (branch protection + required check)

## Phase 3 — Auto-fix PR

- [ ] `cf-ready fix --create-pr` or Action job
- [ ] Safe generators only; review required for risky changes

## Phase 4 — Web dashboard

- [ ] Persistent projects (GitHub App)
- [ ] Scan history and report viewer
- [ ] Team / client reporting

## Phase 5 — Deployment assistant

- [ ] Wrangler config validation
- [ ] Opt-in Cloudflare API checks
- [ ] Post-deploy smoke + rollback workflows

## Manual / owner actions

- GitHub repo homepage: `https://ready.orangecloud.vn`
- npm org access for `@orangecloud`
- Worker secrets: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`

## Non-goals (MVP)

No automatic production deploy, no silent source edits, no required Cloudflare API access. See [README — Non-goals](README.md#non-goals-for-mvp).
