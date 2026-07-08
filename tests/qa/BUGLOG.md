# QA Bug Log — cf-ready v0.1.0

## Inventory

| ID | Feature | Acceptance criteria |
|----|---------|-------------------|
| G1 | Global flags `--cwd`, `--config`, `--json`, `--verbose`, `--no-color` | Flags apply to all subcommands; `--json` emits parseable stdout only |
| G2 | `--version`, `--help` | Print version/help; exit 0 |
| C1 | `scan` | Full module run, 9 reports, exit 1 if not production-ready, exit 2 on error |
| C2 | `inspect` | Repository metadata only; `--json` is valid JSON only |
| C3 | `migration-plan` | Writes migration-plan.md |
| C4 | `security-scan` | SARIF output; exit reflects blockers |
| C5 | `ai-ready` / `seo-ready` | Category report written |
| C6 | `fix` | Requires `--ai-readiness` or `--seo`; skip existing unless `--force` |
| C7 | `report` | Regenerates all reports |
| C8 | `deploy-check` | Deployment + migration + security modules |
| C9 | `smoke-test --url` | HTTP checks; `--url` required |
| W1 | Config loading | Valid Zod parse; explicit missing config errors |
| W2 | Safety | Read-only except `fix`; no destructive ops |

## Bugs found — RESOLVED in QA pass 2

| ID | Status | Fix |
|----|--------|-----|
| BUG-001 | Fixed | Skip human headings when `--json`; defer heading until after validation |
| BUG-002 | Fixed | Explicit `--config` missing file throws `Config file not found` |
| BUG-003 | Fixed | `validateProjectRoot()` before all scans |
| BUG-004 | Fixed | Human-readable Zod error formatting |
| BUG-005 | Fixed | `publicAssetExists()` checks root + public paths |

## QA pass 2 result: **CLEAN** (all inventory cases pass expected exit codes)
