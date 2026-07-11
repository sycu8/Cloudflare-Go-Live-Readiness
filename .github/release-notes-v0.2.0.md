## Accuracy and evidence

- Structured `evidenceItems` (file, line, snippet) on migration blockers and secret findings
- Per-package npm audit findings with CVE/advisory evidence
- Confidence-weighted scoring with capped non-blocker deductions
- Cross-module dedupe (SEO owns robots.txt / sitemap.xml)
- Config `baseline.ignoredFindingIds` / `acceptedRiskIds`

## Reports and remediation

- `remediation` object on findings (steps, docs URL, cf-ready command, wrangler snippet)
- Markdown reports: evidence tables, remediation steps, full finding list
- PDF and SARIF include evidence and remediation help text
- Web Agent Results cards show evidence, recommendation, and fix commands
- `cf-ready fix --finding <id>` and `--rescan` after fix

## Platform

- Windows EPERM fix, CI hardening, npm publish NPM_TOKEN preflight
- Web Agent allows `fix` command

**Install:** `npm install -g @orangecloud/cf-ready@0.2.0`
