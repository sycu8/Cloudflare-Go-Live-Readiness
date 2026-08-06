# CF Ready Roadmap

Living roadmap for [CF Ready](https://ready.orangecloud.vn) (`@orangecloud/cf-ready`). See also the [README Roadmap](README.md#roadmap) for the original five-phase vision.

**Next steps (actionable plan):** [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) — Phases A–D with checklists, acceptance criteria, and risks.

## Shipped (v0.3.0)

| Item | Status | Notes |
|------|--------|-------|
| Framework adapters (Astro, Remix, Hono) | Shipped | Deep analyzers + fixtures + remediation |
| Action npm install path | Shipped | `install-from: npm` default; source for dogfood |
| `cf-ready fix --create-pr` | Shipped | Safe AI/SEO assets; `--dry-run` supported |

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

## Recommended order (remaining)

1. **Owner ops** — homepage URL, npm publish `0.3.0`, tag `v0.3.0` / `v0.3`, Worker secrets
2. **Marketplace listing** — submit Action after version tags
3. **Branch protection** — require Action check with `fail-on-blocker: true` on consumer repos
4. Phase 4 dashboard / Phase 5 deploy assistant (later)

## Phase 2 — GitHub Action (README)

- [x] Composite action: scan, SARIF upload, artifacts
- [x] Dogfood workflow on PRs (`.github/workflows/cf-ready-pr.yml`)
- [x] External npm install path (`install-from: npm`)
- [ ] Publish action to Marketplace / version tags (owner: tag `v0.3.0` after npm publish)
- [ ] Block merges on blockers (document branch protection — see [action/README.md](action/README.md))

## Phase 3 — Auto-fix PR

- [x] `cf-ready fix --create-pr` (CLI; safe assets only)
- [ ] Optional Action job / comment trigger for scheduled safe fixes
- [x] Safe generators only; review required for risky changes

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
- npm publish `@orangecloud/cf-ready@0.3.0` and tag Action `v0.3.0` / `v0.3`
- Worker secrets: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`
- Draft PR #48 (Buy Me a Coffee) — land or close

## Non-goals (MVP)

No automatic production deploy, no silent source edits, no required Cloudflare API access. See [README — Non-goals](README.md#non-goals-for-mvp).
