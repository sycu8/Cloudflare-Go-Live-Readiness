# CF Ready — Full QA Inventory & Acceptance Criteria

Pass criteria: each row’s acceptance criteria met; edge cases return documented behavior without crash/data loss.

**Roles:** Anonymous (open mode), Authenticated user, GitHub-connected user. No admin RBAC.

---

## Docs site (`/`)

| ID | Feature | Acceptance criteria | Edge cases |
|----|---------|---------------------|------------|
| D1 | Landing `/` | Loads; logo, CTA, theme toggle work | Missing assets → 404 only for asset |
| D2 | Docs pages `/docs/*` | All linked pages load; nav consistent | Broken internal links fail link check |
| D3 | Theme toggle | Persists preference; no flash on load | Invalid localStorage → default dark |
| D4 | SEO files | `robots.txt`, `sitemap.xml`, `llms.txt` served | — |

---

## Auth (`/app/`, `/api/auth/*`)

| ID | Feature | Acceptance criteria | Edge cases |
|----|---------|---------------------|------------|
| A1 | Open mode | No OAuth secrets → skip login; banner shown | HTML auth config → fallback open mode |
| A2 | Login screen | Google/GitHub buttons when configured | `auth_error` query shows alert |
| A3 | Session cookie | 30-day HttpOnly cookie on login | Expired cookie → 401 on `/api/auth/me` |
| A4 | Logout | Clears cookie; reload shows login | Double logout → no error |
| A5 | GitHub connect | Connect enables private repo import | No session param → login flow |
| A6 | Workspace ownership | Auth enforced → session tied to user | Other user’s session ID → 403 |

---

## Web Agent UI (`/app/`)

| ID | Feature | Acceptance criteria | Edge cases |
|----|---------|---------------------|------------|
| W1 | Session bootstrap | Creates/reuses `cf-ready-session` in sessionStorage | Stale ID → new session |
| W2 | ZIP upload | Accepts `.zip` ≤50MB; lists files | Empty zip → error message |
| W3 | GitHub URL import | `owner/repo` and full URL work; async wait | Private repo without connect → clear error |
| W4 | My repos | Lists ≤30 repos; Import per repo | Not connected → prompt to connect |
| W5 | Quick command chips | 8 commands run via exec API | Unknown command → stderr in terminal |
| W6 | CLI terminal | `cf-ready>` prompt; backspace; Enter runs | Empty line → no-op |
| W7 | Chat | Send message; agent reply; may run command | Empty message → no send |
| W8 | Results panel | Scores, filters, PDF download/regenerate | No scan → empty state |
| W9 | Mobile tabs | Project / Workspace / Results switch | Resize → terminal fits |
| W10 | Status pill | Reflects idle/importing/running/done/error | pollStatus fail on mount → idle |
| W11 | XSS safety | User/repo/path content escaped in DOM | Malicious paths/names → escaped |

---

## API (`/api/*`)

| ID | Feature | Acceptance criteria | Edge cases |
|----|---------|---------------------|------------|
| P1 | `GET /api/health` | `{ ok: true }` | — |
| P2 | `POST /api/sessions` | Returns `sessionId` UUID | Auth enforced without login → 401 |
| P3 | Session exec | Allowed commands only; JSON with `--json` | `fix` blocked in sandbox |
| P4 | Import GitHub | Returns importing; completes to idle | Invalid URL → 400 |
| P5 | Reports PDF | GET pdf; POST regenerate | No scan → 404 or error |
| P6 | Chat | Returns `reply` + optional `command` | AI unavailable → graceful error |
| P7 | API errors | JSON errors; no HTML parse in client | 524/504 → timeout message |

---

## CLI (11 commands)

| ID | Feature | Acceptance criteria | Edge cases |
|----|---------|---------------------|------------|
| G1 | Global flags | `--cwd`, `--config`, `--json`, `--verbose`, `--no-color` | Invalid cwd → exit 2 |
| G2 | `--version`, `--help` | Exit 0 | — |
| C1 | `scan` | Full scan; exit 1 if not ready | — |
| C2 | `inspect` | Metadata JSON only with `--json` | — |
| C3–C9 | Other commands | Per `tests/qa/BUGLOG.md` | See run-qa.sh edge cases |

---

## Regression test map

| Inventory IDs | Test file |
|---------------|-----------|
| G*, C* | `tests/qa/run-qa.sh`, `tests/integration/cli-*.test.ts` |
| W8, W11 | `tests/unit/ui-render.test.ts`, `tests/unit/ui-security.test.ts` |
| P7, W3 | `tests/unit/api-client.test.ts` |
| A1 | `tests/unit/auth-config.test.ts` |
| Seed scale | `tests/qa/seed/scan-result-large.json` |

---

## QA execution

```bash
npm run test:qa          # Full inventory runner
npm run test:qa:cli      # CLI-only bash runner
```

Results: `tests/qa/results-full.log`, `tests/qa/BUGLOG.md`.
