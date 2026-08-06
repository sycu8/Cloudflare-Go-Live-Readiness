# CF Ready — AI Agent Fix Prompts

**Project:** static-site
**Framework:** static

Copy any prompt below into your AI coding agent to apply a guided fix.
Prompts are generated offline from scan findings (no API call required).

## Fix all priority findings (batch)

````
You are helping me make this project Cloudflare production-ready based on a cf-ready scan.
Work through the findings in order. Prefer minimal, safe changes. Do not deploy automatically.
Do not change auth, payment, or database logic without explicit approval.

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Open findings (15)

### 1. [LOW] No security headers configuration detected (`security-2`)
No _headers, vercel.json headers, or wrangler security config found.
- Fix: Add security headers (CSP, HSTS, X-Frame-Options) via Cloudflare Transform Rules or _headers file.

### 2. [HIGH] Vulnerable dependency: brace-expansion (`security-dep-brace-expansion-brace-expansion`)
high severity vulnerability in brace-expansion.
- Fix: Run npm audit fix
- Fix: Review advisory and upgrade manually
- Files: package.json

### 3. [MEDIUM] Vulnerable dependency: hono (`security-dep-hono-hono`)
moderate severity vulnerability in hono.
- Fix: Run npm audit fix
- Fix: Review advisory and upgrade manually
- Files: package.json

### 4. [HIGH] Vulnerable dependency: miniflare (`security-dep-miniflare-sharp`)
high severity vulnerability in miniflare.
- Fix: Run npm audit fix
- Fix: Review advisory and upgrade manually
- Files: package.json

### 5. [HIGH] Vulnerable dependency: postcss (`security-dep-postcss-postcss`)
high severity vulnerability in postcss.
- Fix: Run npm audit fix
- Fix: Review advisory and upgrade manually
- Files: package.json

### 6. [HIGH] Vulnerable dependency: sharp (`security-dep-sharp-sharp`)
high severity vulnerability in sharp.
- Fix: Run npm audit fix
- Fix: Review advisory and upgrade manually
- Files: package.json

### 7. [HIGH] Vulnerable dependency: undici (`security-dep-undici-undici`)
high severity vulnerability in undici.
- Fix: Run npm audit fix
- Fix: Review advisory and upgrade manually
- Files: package.json

### 8. [HIGH] Vulnerable dependency: wrangler (`security-dep-wrangler-miniflare`)
high severity vulnerability in wrangler.
- Fix: Run npm audit fix
- Fix: Review advisory and upgrade manually
- Files: package.json

### 9. [MEDIUM] Missing llms.txt (`ai-missing-llms-txt`)
llms.txt not found. AI crawlers and agents use these files for discovery.
- Fix: Run cf-ready fix --ai-readiness to generate a draft llms.txt.
- Fix: Review and commit the generated file.

### 10. [MEDIUM] Missing llms-full.txt (`ai-missing-llms-full-txt`)
llms-full.txt not found. AI crawlers and agents use these files for discovery.
- Fix: Run cf-ready fix --ai-readiness to generate a draft llms-full.txt.
- Fix: Review and commit the generated file.

### 11. [MEDIUM] Missing Open Graph metadata (`seo-missing-open-graph`)
Open Graph metadata not detected in scanned files.
- Fix: Add Open Graph metadata to your layout or page metadata.
- Fix: Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

### 12. [MEDIUM] Missing Twitter/X card metadata (`seo-missing-twitter-card`)
Twitter/X card metadata not detected in scanned files.
- Fix: Add Twitter/X card metadata to your layout or page metadata.
- Fix: Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

### 13. [MEDIUM] Missing JSON-LD structured data (`seo-missing-json-ld`)
JSON-LD structured data not detected in scanned files.
- Fix: Add JSON-LD structured data to your layout or page metadata.
- Fix: Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

### 14. [MEDIUM] Missing sitemap.xml (`seo-missing-sitemap-xml`)
No sitemap found for search engine discovery.
- Fix: Run cf-ready fix --seo to generate a draft sitemap.xml.
- Fix: Review and commit the generated file.

### 15. [MEDIUM] No package.json found (`deployment-19`)
Cannot verify npm scripts without package.json.
- Fix: Add package.json with build, dev, and start scripts.

## Your task
1. Fix blockers and high-severity items first.
2. For each change, keep diffs focused and explain why it helps Cloudflare Workers/Pages readiness.
3. After edits, list remaining manual steps (wrangler secrets, DNS, dashboard).
4. If useful, suggest running `cf-ready scan` again to verify.
````

## Per-finding prompts

### [LOW] No security headers configuration detected

Finding ID: `security-2`

**How to fix:**

1. Add security headers (CSP, HSTS, X-Frame-Options) via Cloudflare Transform Rules or _headers file.

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: security-2
- Category: security
- Severity: low
- Title: No security headers configuration detected
- Description: No _headers, vercel.json headers, or wrangler security config found.

## Recommended fix guidance
1. Add security headers (CSP, HSTS, X-Frame-Options) via Cloudflare Transform Rules or _headers file.

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [HIGH] Vulnerable dependency: brace-expansion

Finding ID: `security-dep-brace-expansion-brace-expansion`

**How to fix:**

1. Run npm audit fix
2. Review advisory and upgrade manually

*Estimated effort: minutes*

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: security-dep-brace-expansion-brace-expansion
- Category: security
- Severity: high
- Title: Vulnerable dependency: brace-expansion
- Description: high severity vulnerability in brace-expansion.
- Confidence: high
- Requires human approval: yes — propose the change and wait for review before applying risky edits.

## Evidence
- package.json — brace-expansion@<=1.1.17 || 4.0.0 - 5.0.8 — brace-expansion
- Affected files: package.json

## Recommended fix guidance
1. Run npm audit fix
2. Review advisory and upgrade manually

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Vulnerable dependency: hono

Finding ID: `security-dep-hono-hono`

**How to fix:**

1. Run npm audit fix
2. Review advisory and upgrade manually

*Estimated effort: minutes*

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: security-dep-hono-hono
- Category: security
- Severity: medium
- Title: Vulnerable dependency: hono
- Description: moderate severity vulnerability in hono.
- Confidence: high
- Requires human approval: yes — propose the change and wait for review before applying risky edits.

## Evidence
- package.json — hono@<4.12.34 — hono
- Affected files: package.json

## Recommended fix guidance
1. Run npm audit fix
2. Review advisory and upgrade manually

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [HIGH] Vulnerable dependency: miniflare

Finding ID: `security-dep-miniflare-sharp`

**How to fix:**

1. Run npm audit fix
2. Review advisory and upgrade manually

*Estimated effort: minutes*

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: security-dep-miniflare-sharp
- Category: security
- Severity: high
- Title: Vulnerable dependency: miniflare
- Description: high severity vulnerability in miniflare.
- Confidence: high
- Requires human approval: yes — propose the change and wait for review before applying risky edits.

## Evidence
- package.json — miniflare@<=0.0.0-fec45ed61 || >=4.20250508.3 — sharp
- Affected files: package.json

## Recommended fix guidance
1. Run npm audit fix
2. Review advisory and upgrade manually

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [HIGH] Vulnerable dependency: postcss

Finding ID: `security-dep-postcss-postcss`

**How to fix:**

1. Run npm audit fix
2. Review advisory and upgrade manually

*Estimated effort: minutes*

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: security-dep-postcss-postcss
- Category: security
- Severity: high
- Title: Vulnerable dependency: postcss
- Description: high severity vulnerability in postcss.
- Confidence: high
- Requires human approval: yes — propose the change and wait for review before applying risky edits.

## Evidence
- package.json — postcss@<=8.5.22 — postcss
- Affected files: package.json

## Recommended fix guidance
1. Run npm audit fix
2. Review advisory and upgrade manually

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [HIGH] Vulnerable dependency: sharp

Finding ID: `security-dep-sharp-sharp`

**How to fix:**

1. Run npm audit fix
2. Review advisory and upgrade manually

*Estimated effort: minutes*

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: security-dep-sharp-sharp
- Category: security
- Severity: high
- Title: Vulnerable dependency: sharp
- Description: high severity vulnerability in sharp.
- Confidence: high
- Requires human approval: yes — propose the change and wait for review before applying risky edits.

## Evidence
- package.json — sharp@<0.35.0 — sharp
- Affected files: package.json

## Recommended fix guidance
1. Run npm audit fix
2. Review advisory and upgrade manually

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [HIGH] Vulnerable dependency: undici

Finding ID: `security-dep-undici-undici`

**How to fix:**

1. Run npm audit fix
2. Review advisory and upgrade manually

*Estimated effort: minutes*

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: security-dep-undici-undici
- Category: security
- Severity: high
- Title: Vulnerable dependency: undici
- Description: high severity vulnerability in undici.
- Confidence: high
- Requires human approval: yes — propose the change and wait for review before applying risky edits.

## Evidence
- package.json — undici@7.0.0 - 7.28.0 — undici
- Affected files: package.json

## Recommended fix guidance
1. Run npm audit fix
2. Review advisory and upgrade manually

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [HIGH] Vulnerable dependency: wrangler

Finding ID: `security-dep-wrangler-miniflare`

**How to fix:**

1. Run npm audit fix
2. Review advisory and upgrade manually

*Estimated effort: minutes*

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: security-dep-wrangler-miniflare
- Category: security
- Severity: high
- Title: Vulnerable dependency: wrangler
- Description: high severity vulnerability in wrangler.
- Confidence: high
- Requires human approval: yes — propose the change and wait for review before applying risky edits.

## Evidence
- package.json — wrangler@<=0.0.0-7ae5dd357 || 4.16.0 - 4.113.0 — miniflare
- Affected files: package.json

## Recommended fix guidance
1. Run npm audit fix
2. Review advisory and upgrade manually

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Missing llms.txt

Finding ID: `ai-missing-llms-txt`

**How to fix:**

1. Run cf-ready fix --ai-readiness to generate a draft llms.txt.
2. Review and commit the generated file.

*Estimated effort: minutes*

```bash
cf-ready fix --ai-readiness
```

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: ai-missing-llms-txt
- Category: ai-readiness
- Severity: medium
- Title: Missing llms.txt
- Description: llms.txt not found. AI crawlers and agents use these files for discovery.

## Recommended fix guidance
1. Run cf-ready fix --ai-readiness to generate a draft llms.txt.
2. Review and commit the generated file.

## cf-ready command (optional)
cf-ready fix --ai-readiness

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Missing llms-full.txt

Finding ID: `ai-missing-llms-full-txt`

**How to fix:**

1. Run cf-ready fix --ai-readiness to generate a draft llms-full.txt.
2. Review and commit the generated file.

*Estimated effort: minutes*

```bash
cf-ready fix --ai-readiness
```

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: ai-missing-llms-full-txt
- Category: ai-readiness
- Severity: medium
- Title: Missing llms-full.txt
- Description: llms-full.txt not found. AI crawlers and agents use these files for discovery.

## Recommended fix guidance
1. Run cf-ready fix --ai-readiness to generate a draft llms-full.txt.
2. Review and commit the generated file.

## cf-ready command (optional)
cf-ready fix --ai-readiness

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Missing Open Graph metadata

Finding ID: `seo-missing-open-graph`

**How to fix:**

1. Add Open Graph metadata to your layout or page metadata.
2. Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

*Estimated effort: minutes*

```bash
cf-ready fix --seo
```

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: seo-missing-open-graph
- Category: seo
- Severity: medium
- Title: Missing Open Graph metadata
- Description: Open Graph metadata not detected in scanned files.

## Recommended fix guidance
1. Add Open Graph metadata to your layout or page metadata.
2. Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

## cf-ready command (optional)
cf-ready fix --seo

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Missing Twitter/X card metadata

Finding ID: `seo-missing-twitter-card`

**How to fix:**

1. Add Twitter/X card metadata to your layout or page metadata.
2. Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

*Estimated effort: minutes*

```bash
cf-ready fix --seo
```

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: seo-missing-twitter-card
- Category: seo
- Severity: medium
- Title: Missing Twitter/X card metadata
- Description: Twitter/X card metadata not detected in scanned files.

## Recommended fix guidance
1. Add Twitter/X card metadata to your layout or page metadata.
2. Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

## cf-ready command (optional)
cf-ready fix --seo

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Missing JSON-LD structured data

Finding ID: `seo-missing-json-ld`

**How to fix:**

1. Add JSON-LD structured data to your layout or page metadata.
2. Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

*Estimated effort: minutes*

```bash
cf-ready fix --seo
```

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: seo-missing-json-ld
- Category: seo
- Severity: medium
- Title: Missing JSON-LD structured data
- Description: JSON-LD structured data not detected in scanned files.

## Recommended fix guidance
1. Add JSON-LD structured data to your layout or page metadata.
2. Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

## cf-ready command (optional)
cf-ready fix --seo

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Missing sitemap.xml

Finding ID: `seo-missing-sitemap-xml`

**How to fix:**

1. Run cf-ready fix --seo to generate a draft sitemap.xml.
2. Review and commit the generated file.

*Estimated effort: minutes*

```bash
cf-ready fix --seo
```

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: seo-missing-sitemap-xml
- Category: seo
- Severity: medium
- Title: Missing sitemap.xml
- Description: No sitemap found for search engine discovery.

## Recommended fix guidance
1. Run cf-ready fix --seo to generate a draft sitemap.xml.
2. Review and commit the generated file.

## cf-ready command (optional)
cf-ready fix --seo

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] No package.json found

Finding ID: `deployment-19`

**How to fix:**

1. Add package.json with build, dev, and start scripts.

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: deployment-19
- Category: deployment
- Severity: medium
- Title: No package.json found
- Description: Cannot verify npm scripts without package.json.

## Recommended fix guidance
1. Add package.json with build, dev, and start scripts.

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Environment variables not documented

Finding ID: `deployment-20`

**How to fix:**

1. Add .env.example listing required variables for Cloudflare deployment.

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: deployment-20
- Category: deployment
- Severity: medium
- Title: Environment variables not documented
- Description: No .env.example or README env documentation found.

## Recommended fix guidance
1. Add .env.example listing required variables for Cloudflare deployment.

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Migration path not selected

Finding ID: `deployment-21`

**How to fix:**

1. Set target and migration.preferredPath in config.

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: static-site
- Framework: static
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: deployment-21
- Category: deployment
- Severity: medium
- Title: Migration path not selected
- Description: No target or migration path configured in cf-ready.config.json.

## Recommended fix guidance
1. Set target and migration.preferredPath in config.

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````
