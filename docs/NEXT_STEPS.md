# Implementation Plan: CF Ready Next Steps

Living plan derived from [ROADMAP.md](../ROADMAP.md). **Phases A–C implemented in v0.3.0.** Remaining: owner publish/tags (Phase D) and later dashboard/deploy phases.

## Overview

Ship real Astro / Remix / Hono migration analysis, close GitHub Action external-consumer gaps, and add safe `fix --create-pr`. Keep the safety model: no auto-deploy, no silent source edits, risky changes require review.

## Specification link

- Tracking: [ROADMAP.md](../ROADMAP.md)
- Public summary: [docs/roadmap.html](docs/roadmap.html)
- Original five-phase vision: [README.md#roadmap](../README.md#roadmap)

## Status

| Phase | Status |
|-------|--------|
| A — Framework adapters | Done (v0.3.0) |
| B — Action npm path + docs | Done (Marketplace tag = owner) |
| C — `fix --create-pr` | Done (optional Action job still open) |
| D — Owner/ops | Open |

---

## Phase A — Framework adapters (v0.3) ✅

### A1. Schema + detection

- [x] Add `"hono"` to `FrameworkSchema`
- [x] Detect Hono via `hono` dependency and entry patterns
- [x] Prefer Hono over generic `nodejs` / `express`
- [x] Enrich Astro / Remix detection (config, adapters, Vite)
- [x] Detect page/API routes for Astro, Remix, Hono

### A2–A4. Analyzers + fixtures

- [x] `astro.ts` / `remix.ts` / `hono.ts` analyzers
- [x] Remediation templates + migration-plan sections
- [x] Fixtures: `astro-app`, `remix-app`, `hono-app`

### A5. Wire-up + polish

- [x] Wire `runMigrationChecks` to analyzers
- [x] Docs + changelog for 0.3.0
- [x] Unit + integration coverage

---

## Phase B — Finish GitHub Action ✅ (tags pending)

- [x] `install-from: npm` default for external consumers
- [x] `install-from: source` for dogfood
- [x] Document Marketplace tags + branch protection in `action/README.md`
- [ ] Owner: publish npm `0.3.0` and push `v0.3.0` / `v0.3` tags

---

## Phase C — Auto-fix PR ✅

- [x] `cf-ready fix --create-pr` (+ `--dry-run`, `--pr-title`, `--pr-branch`)
- [x] Scope: safe AI/SEO assets only
- [ ] Optional companion Action job (follow-up)

---

## Phase D — Owner / ops (parallel)

- [ ] Set GitHub repo homepage to `https://ready.orangecloud.vn`
- [ ] Publish `@orangecloud/cf-ready@0.3.0`
- [ ] Verify Worker OAuth secrets
- [ ] Close or land draft PR #48

## Later

| Phase | Focus |
|-------|--------|
| 4 — Web dashboard | GitHub App, scan history, report viewer |
| 5 — Deploy assistant | Wrangler validation, opt-in CF API, smoke + rollback |
