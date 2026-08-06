# Implementation Plan: CF Ready Next Steps

Living plan derived from [ROADMAP.md](../ROADMAP.md). Target release focus: **v0.3** (framework adapters), then finish Phase 2 leftovers, then Phase 3 auto-fix PR.

## Overview

Ship real Astro / Remix / Hono migration analysis (today they are detection-only stubs), close GitHub Action marketplace gaps, then add safe `fix --create-pr`. Keep the safety model: no auto-deploy, no silent source edits, risky changes require review.

## Specification link

- Tracking: [ROADMAP.md](../ROADMAP.md)
- Public summary: [docs/roadmap.html](docs/roadmap.html)
- Original five-phase vision: [README.md#roadmap](../README.md#roadmap)

## Technical approach

Mirror the existing Next.js / Vite analyzer pattern:

1. Detect framework + config files (extend `src/inspectors/framework.ts`).
2. Add dedicated analyzers under `src/modules/migration/` (e.g. `astro.ts`, `remix.ts`, `hono.ts`).
3. Wire findings through remediation templates (`src/config/remediation-templates.ts`) and migration plan markdown.
4. Add fixtures under `tests/fixtures/` and unit/integration coverage.
5. Keep Hono as a first-class `Framework` enum value (schema today has no `hono`).

---

## Phase A — Framework adapters (v0.3)

**Goal:** Replace the generic “review Cloudflare adapter docs” info finding with actionable checks, evidence, and remediation.

### A1. Schema + detection

- [ ] Add `"hono"` to `FrameworkSchema` in `src/config/schema.js`
- [ ] Detect Hono via `hono` dependency and common entry patterns (`src/index.ts`, `src/app.ts`, `worker.ts`)
- [ ] Prefer Hono over generic `nodejs` / `express` when both appear
- [ ] Enrich Astro detection: `astro.config.*`, `@astrojs/cloudflare`, SSR vs static
- [ ] Enrich Remix detection: `vite.config` + `@remix-run/*`, Remix Vite vs classic, Cloudflare templates (`@remix-run/cloudflare`)
- [ ] Detect page/API routes for Astro (`src/pages`), Remix (`app/routes`), Hono (`app.get` / `route` usage where cheap)

### A2. Astro analyzer

- [ ] Add `src/modules/migration/astro.ts`
- [ ] Findings: static vs hybrid/SSR; missing `@astrojs/cloudflare`; output/`adapter` config; Node-only integrations; Assets / Pages target recommendation
- [ ] Remediation steps + docs URL in `FRAMEWORK_MIGRATION`
- [ ] Migration-plan markdown section for Astro → Workers/Pages
- [ ] Fixture: `tests/fixtures/astro-app` (minimal static + optional SSR variant or config flag)

### A3. Remix analyzer

- [ ] Add `src/modules/migration/remix.ts`
- [ ] Findings: Cloudflare adapter present vs Node server; loaders/actions Node APIs; session/storage; `@remix-run/cloudflare` / Workers template guidance
- [ ] Remediation + migration-plan section
- [ ] Fixture: `tests/fixtures/remix-app`

### A4. Hono analyzer

- [ ] Add `src/modules/migration/hono.ts`
- [ ] Findings: Workers-ready vs Node adapter (`@hono/node-server`); recommend `wrangler` + `nodejs_compat` only when needed; Durable Object / KV hints when imports present
- [ ] Remediation + migration-plan section
- [ ] Fixture: `tests/fixtures/hono-app`

### A5. Wire-up + polish

- [ ] Switch `runMigrationChecks` from stub info findings to analyzers
- [ ] Update Web Agent / report copy if framework lists are hardcoded
- [ ] Docs: `migration-readiness.html`, examples, changelog entry for 0.3.0
- [ ] Tests: unit for each analyzer; integration scan on new fixtures

**Acceptance criteria**

- Scanning an Astro, Remix, or Hono fixture yields ≥2 specific migration findings (not only `migration-astro` / etc. stubs).
- Remediation includes concrete docs URL + steps.
- `npm test` + `npm run test:integration` pass with new fixtures.

---

## Phase B — Finish GitHub Action (Phase 2 leftovers)

**Goal:** Make the shipped composite action easy to adopt outside this repo.

### B1. Version tags + Marketplace packaging

- [ ] Tag action releases (`v1`, `v1.0.0`) pointing at a consumable layout
- [ ] Decide install story: build-from-repo vs publish `@orangecloud/cf-ready` and run `npx` (preferred for external repos — avoid requiring `cf-ready-root` build)
- [ ] Add Marketplace metadata / branding checklist in `action/` README or docs
- [ ] Document consumer workflow snippet that does **not** assume monorepo paths

### B2. Block merges on blockers

- [ ] Document branch protection + required check using `fail-on-blocker: true` (already default)
- [ ] Dogfood: ensure `.github/workflows/cf-ready-pr.yml` is a clear required-check example
- [ ] Optional: soft-fail mode docs for gradual adoption (`fail-on-blocker: false` + comment-only)

**Acceptance criteria**

- External repo can copy one workflow and get scan + SARIF + PR summary without cloning this package source.
- Docs list exact branch-protection steps.

---

## Phase C — Auto-fix PR (Phase 3)

**Goal:** `cf-ready fix --create-pr` (CLI and/or Action job) opens a branch with **safe** generated assets only.

### C1. CLI

- [ ] Add `--create-pr` to `fix` (requires git + `gh` or GitHub token)
- [ ] Scope: only files already allowed by `--ai-readiness` / `--seo` / `--finding` (robots, sitemap, llms.txt, drafts)
- [ ] Never auto-include risky / approval-required finding fixes
- [ ] PR body: readiness score, finding list, link to report artifact

### C2. Action job (optional companion)

- [ ] Workflow / action input to run safe fix + open PR on a schedule or `/cf-ready fix` comment
- [ ] Require human review; do not auto-merge

**Acceptance criteria**

- Dry-run / test mode creates branch + PR with only allowlisted files.
- Risky findings remain recommendations, not file edits.

---

## Phase D — Owner / ops (parallel, non-code)

Manual items from ROADMAP — do not block Phase A:

- [ ] Set GitHub repo homepage to `https://ready.orangecloud.vn`
- [ ] Confirm npm org access for `@orangecloud`
- [ ] Verify Worker secrets: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`
- [ ] Close or land draft PR #48 (Buy Me a Coffee) if still desired

---

## Later (do not start until A–C land)

| Phase | Focus |
|-------|--------|
| 4 — Web dashboard | GitHub App, scan history, report viewer, team reporting |
| 5 — Deploy assistant | Wrangler validation, opt-in CF API checks, smoke + rollback |

Near-term Web Agent item from docs (“session persistence”) can be a small follow-up after A if needed for UX; it is not a v0.3 release blocker.

---

## Dependencies

| Need | Why |
|------|-----|
| Cloudflare Astro / Remix / Hono docs (stable URLs) | Remediation `docsUrl` targets |
| npm package install path for Action consumers | Phase B external adoption |
| `gh` / GitHub token in CI | Phase C PR creation |
| Fixtures without heavy lockfiles | Keep CI fast |

## Risks

| Risk | Mitigation |
|------|------------|
| Framework APIs drift (Remix Vite, Astro adapters) | Prefer config/dependency signals over brittle AST; keep findings advisory |
| False “ready for Workers” confidence | Severity `info`/`medium` until evidence is strong; requireApproval on adapter migrations |
| Action marketplace complexity | Prefer `npx @orangecloud/cf-ready` over shipping a full build inside the composite action |
| Scope creep into Phase 4/5 | Keep v0.3 = adapters only; track dashboard/deploy separately |

## Suggested sequencing

```text
A1 detection/schema
 → A2 Astro → A3 Remix → A4 Hono (can parallelize after A1)
 → A5 wire-up/docs/tests → release 0.3.0
 → B1/B2 Action packaging
 → C1 fix --create-pr
```

Owner ops (Phase D) anytime in parallel.
