# QA Bug Log — cf-ready v0.1.0

## Inventory

See `tests/qa/INVENTORY.md` for full feature matrix (docs, auth, web agent, API, CLI).

### CLI (legacy IDs)

| ID | Feature | Acceptance criteria |
|----|---------|-------------------|
| G1 | Global flags | Flags apply to all subcommands; `--json` emits parseable stdout only |
| G2 | `--version`, `--help` | Print version/help; exit 0 |
| C1–C9 | CLI commands | Per `tests/qa/run-qa.sh` |
| W1–W2 | Config / safety | Valid Zod parse; read-only except `fix` |

---

## Bugs found — QA pass 3 (2026-07-08)

| ID | Severity | Feature | Reproduction | Fix |
|----|----------|---------|--------------|-----|
| BUG-006 | High | W11 UI render | `web/src/ui/render.ts` imported `./api/client.js` (wrong path); `tsc` failed | Changed to `../api/client.js` |
| BUG-007 | High | W11 File tree XSS | `app.ts` injected file paths via `innerHTML` without escaping | Use `escapeHtml()` on path text and title |
| BUG-008 | Medium | W11 Avatar XSS | `renderUserMenu` used raw `avatarUrl` in `src` | `sanitizeAvatarUrl()` — only http(s); fallback to initial |
| BUG-009 | Medium | CI Node 18 | Integration tests timed out at 30s on slow runners | Vitest `testTimeout: 90_000` |
| BUG-010 | Low | Test accuracy | Web agent test name said "nextjs" but used static-site | Renamed test description |
| BUG-011 | Low | W3 GitHub import | `/owner/repo` shorthand not expanded to https URL | Strip leading slashes before owner/repo match |

## Bugs found — QA pass 4 (import fix)

| ID | Severity | Feature | Reproduction | Fix |
|----|----------|---------|--------------|-----|
| BUG-012 | High | W3 GitHub import | Import fails with cryptic "file error" / timeout; pipe tar fragile; HEAD ref; auto-scan blocks idle | Download archive to file then extract; resolve HEAD→default branch; use commit SHA; shell-quote tokens; RPC transport; background auto-scan; client accepts `done` status |

## Bugs found — RESOLVED in QA pass 2

| ID | Status | Fix |
|----|--------|-----|
| BUG-001 | Fixed | Skip human headings when `--json` |
| BUG-002 | Fixed | Explicit `--config` missing file throws |
| BUG-003 | Fixed | `validateProjectRoot()` before all scans |
| BUG-004 | Fixed | Human-readable Zod error formatting |
| BUG-005 | Fixed | `publicAssetExists()` checks root + public paths |

## QA pass 3 result

- **CLI inventory:** `tests/qa/run-qa.sh`
- **Full runner:** `npm run test:qa`
- **Regression:** `tests/unit/ui-render.test.ts`, `ui-security.test.ts`, `api-client.test.ts`

## Blocked handoff

| Item | Reason |
|------|--------|
| Live Web Agent E2E (import/upload/sandbox) | Docker not available in this environment; use `npm run dev:web` + Docker locally |
| Production E2E | Requires explicit approval + `CF_READY_AUTH_COOKIE` |
| OAuth E2E | Requires real OAuth secrets in `.dev.vars` |

## Full QA run 2026-07-08T15:37:48.667Z
- Result: **2 step(s) failed**
- Log: tests/qa/results-full.log

## Full QA run 2026-07-08T15:38:37.414Z
- Result: **2 step(s) failed**
- Log: tests/qa/results-full.log

## Full QA run 2026-07-08T15:39:30.098Z
- Result: **1 step(s) failed**
- Log: tests/qa/results-full.log

## Full QA run 2026-07-08T15:39:55.659Z
- Result: **1 step(s) failed**
- Log: tests/qa/results-full.log

## Full QA run 2026-07-08T15:40:33.906Z
- Result: **CLEAN PASS**
- Log: tests/qa/results-full.log
