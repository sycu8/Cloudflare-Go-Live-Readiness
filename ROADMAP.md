# CF Ready Roadmap

Living roadmap for [CF Ready](https://ready.orangecloud.vn) (`@orangecloud/cf-ready`). See also the [README Roadmap](README.md#roadmap) for the original five-phase vision.

**Next steps (actionable plan):** [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) — Phases A–D with checklists, acceptance criteria, and risks.

## Shipped (v0.2.1)

| Item | Status | Notes |
|------|--------|-------|
| npm `@orangecloud/cf-ready` | Shipped | [v0.2.1 on npmjs.org](https://www.npmjs.com/package/@orangecloud/cf-ready) |
| Web Agent 30-minute scan timeout | Shipped | Shared exec timeouts; parallel rescan tuning |
| Evidence + remediation reports | Shipped | v0.2.0 — markdown, PDF, SARIF, Web UI |
| GitHub Action (PR readiness) | Shipped | [`action/action.yml`](action/action.yml), [docs](docs/docs/github-action.html) |
| Private repo import UI | Shipped | Web Agent repo picker + OAuth token import |
| OG / SEO polish | Shipped | `docs/assets/og.png`, meta on doc pages |

## Shipped (v0.1)

- Production CLI: scan, inspect, security, AI/SEO readiness, reports, smoke-test
- Marketing site + docs at [ready.orangecloud.vn](https://ready.orangecloud.vn)
- Web Agent MVP at [/app/](https://ready.orangecloud.vn/app/)
- Cloudflare Worker deploy (Sandbox, Session DO, R2/KV)
- GitHub OAuth scaffold for private repos

## In progress (v0.3)

| Item | Status | Notes |
|------|--------|-------|
| Framework adapters (Astro, Remix, Hono) | Planned | Detection only today — see [NEXT_STEPS Phase A](docs/NEXT_STEPS.md#phase-a--framework-adapters-v03) |

### Recommended order

1. **Phase A** — Astro / Remix / Hono deep adapters → release `0.3.0`
2. **Phase B** — Action Marketplace tags + external-consumer install path + branch-protection docs
3. **Phase C** — `cf-ready fix --create-pr` (safe assets only)
4. **Phase D** — Owner/ops (homepage, npm org, Worker secrets) — parallel anytime

## Phase 2 — GitHub Action (README)

- [x] Composite action: scan, SARIF upload, artifacts
- [x] Dogfood workflow on PRs (`.github/workflows/cf-ready-pr.yml`)
- [ ] Publish action to Marketplace / version tags — [NEXT_STEPS Phase B](docs/NEXT_STEPS.md#phase-b--finish-github-action-phase-2-leftovers)
- [ ] Block merges on blockers (branch protection + required check)

## Phase 3 — Auto-fix PR

- [ ] `cf-ready fix --create-pr` or Action job — [NEXT_STEPS Phase C](docs/NEXT_STEPS.md#phase-c--auto-fix-pr-phase-3)
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
- Draft PR #48 (Buy Me a Coffee) — land or close

## Non-goals (MVP)

No automatic production deploy, no silent source edits, no required Cloudflare API access. See [README — Non-goals](README.md#non-goals-for-mvp).
