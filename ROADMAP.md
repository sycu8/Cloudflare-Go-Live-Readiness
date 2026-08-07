# CF Ready Roadmap

Living roadmap for [CF Ready](https://ready.orangecloud.vn) (`@orangecloud/cf-ready`). See also the [README Roadmap](README.md#roadmap).

## Status snapshot

| README phase | Status |
|--------------|--------|
| 1 — Production CLI | Shipped |
| 2 — GitHub Action | Shipped (Marketplace listing = owner) |
| 3 — Auto-fix PR | Shipped CLI + `action/fix` |
| 4 — Web dashboard | Planned |
| 5 — Deploy assistant | **In progress** — Wrangler validation + post-deploy checklist (v0.3.2) |

## Shipped (v0.3.2)

| Item | Status | Notes |
|------|--------|-------|
| Wrangler deep validation | Shipped | name / compatibility_date / entry / stale date |
| `post-deploy-checklist.md` | Shipped | Smoke-test + rollback + AI prompt |
| `action/fix` safe-fix PR | Shipped | Example workflow under `examples/` |

## Shipped (v0.3.1)

| Item | Status | Notes |
|------|--------|-------|
| Fix guidance + AI agent prompts | Shipped | Reports + Web Agent copy button |
| npm `@orangecloud/cf-ready@0.3.1` | Shipped | [npmjs.org](https://www.npmjs.com/package/@orangecloud/cf-ready) |

## Shipped (v0.3.0)

| Item | Status | Notes |
|------|--------|-------|
| Framework adapters (Astro, Remix, Hono) | Shipped | Deep analyzers + fixtures + remediation |
| Action npm install path | Shipped | `install-from: npm` default |
| `cf-ready fix --create-pr` | Shipped | Safe AI/SEO assets; `--dry-run` |

## Recommended order (remaining)

1. **Owner** — GitHub homepage/topics; Marketplace listing; Automation `NPM_TOKEN` for CI publish
2. **Phase 5 continued** — opt-in Cloudflare API checks; preview deploy orchestration
3. **Phase 4** — Web dashboard (GitHub App, history, team reports)

## Phase 2 — GitHub Action

- [x] Composite action: scan, SARIF upload, artifacts
- [x] Dogfood workflow on PRs
- [x] External npm install path
- [x] Version tags `v0.3` / `v0.3.x`
- [ ] Publish action to Marketplace (owner)
- [x] Branch-protection docs (`action/README.md`)

## Phase 3 — Auto-fix PR

- [x] `cf-ready fix --create-pr`
- [x] `action/fix` composite + example workflow
- [x] Safe generators only; review required

## Phase 4 — Web dashboard

- [ ] Persistent projects (GitHub App)
- [ ] Scan history and report viewer
- [ ] Team / client reporting

## Phase 5 — Deployment assistant

- [x] Wrangler config validation (local, no API)
- [x] Post-deploy checklist + smoke-test reminder
- [ ] Opt-in Cloudflare API checks
- [ ] Preview deploy / rollback workflow automation

## Manual / owner actions

- [x] Tag Action `v0.3.x` + GitHub Releases
- [x] npm `@orangecloud/cf-ready@0.3.2` published
- [ ] GitHub repo homepage → `https://ready.orangecloud.vn` (Settings → General; agent lacks admin)
- [ ] Topics on GitHub repo (agent lacks admin)
- [ ] Prefer CI `NPM_TOKEN` = npm **Automation** token (no OTP) for future publishes
- [ ] Worker OAuth secrets if using private GitHub import

## Non-goals (MVP)

No automatic production deploy, no silent source edits, no required Cloudflare API access.
