# Changelog

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
