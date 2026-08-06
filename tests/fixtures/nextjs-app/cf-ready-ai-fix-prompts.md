# CF Ready — AI Agent Fix Prompts

**Project:** Next.js Fixture App
**Framework:** nextjs

Copy any prompt below into your AI coding agent to apply a guided fix.
Prompts are generated offline from scan findings (no API call required).

## Fix all priority findings (batch)

````
You are helping me make this project Cloudflare production-ready based on a cf-ready scan.
Work through the findings in order. Prefer minimal, safe changes. Do not deploy automatically.
Do not change auth, payment, or database logic without explicit approval.

## Project context
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Open findings (15)

### 1. [BLOCKER] Runtime blocker: fs (`migration-fs`)
Detected fs usage incompatible with Cloudflare Workers runtime.
- Fix: Replace filesystem reads/writes with R2 bindings or fetch() to static assets.
- Fix: Use Workers KV for small configuration blobs instead of local files.
- Files: app/api/upload/route.ts

### 2. [MEDIUM] Next.js middleware detected (`migration-3`)
Middleware may have edge runtime constraints on Cloudflare.
- Fix: Review middleware for Node.js APIs and test with vinext check.

### 3. [MEDIUM] vinext may be risky — consider OpenNext fallback (`migration-vinext-recommended`)
Middleware, API routes, or runtime blockers suggest opennext may be safer than vinext.
- Fix: Consider opennext as fallback. Run suggested commands manually:
npx vinext check
npx vinext init --platform=cloudflare
npm run build:vinext
npx @vinext/cloudflare deploy --dry-run

### 4. [LOW] No security headers configuration detected (`security-6`)
No _headers, vercel.json headers, or wrangler security config found.
- Fix: Add security headers (CSP, HSTS, X-Frame-Options) via Cloudflare Transform Rules or _headers file.

### 5. [MEDIUM] Missing llms.txt (`ai-missing-llms-txt`)
llms.txt not found. AI crawlers and agents use these files for discovery.
- Fix: Run cf-ready fix --ai-readiness to generate a draft llms.txt.
- Fix: Review and commit the generated file.

### 6. [MEDIUM] Missing llms-full.txt (`ai-missing-llms-full-txt`)
llms-full.txt not found. AI crawlers and agents use these files for discovery.
- Fix: Run cf-ready fix --ai-readiness to generate a draft llms-full.txt.
- Fix: Review and commit the generated file.

### 7. [MEDIUM] API routes without OpenAPI documentation (`ai-api-openapi`)
1 API route(s) detected without OpenAPI spec.
- Fix: Run cf-ready fix --ai-readiness to generate a draft openapi.json.
- Fix: Review and commit the generated file.

### 8. [LOW] No MCP server card (`ai-mcp-card`)
mcp-server-card.json not found for agent discovery.
- Fix: Run cf-ready fix --ai-readiness to generate a draft mcp-server-card.json.
- Fix: Review and commit the generated file.

### 9. [MEDIUM] Missing Page title (`seo-missing-page-title`)
Page title not detected in scanned files.
- Fix: Add Page title to your layout or page metadata.
- Fix: Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

### 10. [MEDIUM] Missing Meta description (`seo-missing-meta-description`)
Meta description not detected in scanned files.
- Fix: Add Meta description to your layout or page metadata.
- Fix: Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

### 11. [MEDIUM] Missing Open Graph metadata (`seo-missing-open-graph`)
Open Graph metadata not detected in scanned files.
- Fix: Add Open Graph metadata to your layout or page metadata.
- Fix: Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

### 12. [MEDIUM] Missing Twitter/X card metadata (`seo-missing-twitter-card`)
Twitter/X card metadata not detected in scanned files.
- Fix: Add Twitter/X card metadata to your layout or page metadata.
- Fix: Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

### 13. [MEDIUM] Missing Canonical URL (`seo-missing-canonical`)
Canonical URL not detected in scanned files.
- Fix: Add Canonical URL to your layout or page metadata.
- Fix: Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

### 14. [MEDIUM] Missing JSON-LD structured data (`seo-missing-json-ld`)
JSON-LD structured data not detected in scanned files.
- Fix: Add JSON-LD structured data to your layout or page metadata.
- Fix: Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

### 15. [MEDIUM] Missing sitemap.xml (`seo-missing-sitemap-xml`)
No sitemap found for search engine discovery.
- Fix: Run cf-ready fix --seo to generate a draft sitemap.xml.
- Fix: Review and commit the generated file.

## Your task
1. Fix blockers and high-severity items first.
2. For each change, keep diffs focused and explain why it helps Cloudflare Workers/Pages readiness.
3. After edits, list remaining manual steps (wrangler secrets, DNS, dashboard).
4. If useful, suggest running `cf-ready scan` again to verify.
````

## Per-finding prompts

### [BLOCKER] Runtime blocker: fs

Finding ID: `migration-fs`

**How to fix:**

1. Replace filesystem reads/writes with R2 bindings or fetch() to static assets.
2. Use Workers KV for small configuration blobs instead of local files.

*Estimated effort: hours*

Docs: https://developers.cloudflare.com/r2/

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: migration-fs
- Category: migration
- Severity: blocker
- Title: Runtime blocker: fs
- Description: Detected fs usage incompatible with Cloudflare Workers runtime.
- Confidence: high
- Requires human approval: yes — propose the change and wait for review before applying risky edits.

## Evidence
- app/api/upload/route.ts:2 — import fs from "fs";
- Affected files: app/api/upload/route.ts

## Recommended fix guidance
1. Replace filesystem reads/writes with R2 bindings or fetch() to static assets.
2. Use Workers KV for small configuration blobs instead of local files.

## Docs
https://developers.cloudflare.com/r2/

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Next.js middleware detected

Finding ID: `migration-3`

**How to fix:**

1. Review middleware for Node.js APIs and test with vinext check.

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: migration-3
- Category: migration
- Severity: medium
- Title: Next.js middleware detected
- Description: Middleware may have edge runtime constraints on Cloudflare.
- Requires human approval: yes — propose the change and wait for review before applying risky edits.

## Recommended fix guidance
1. Review middleware for Node.js APIs and test with vinext check.

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] vinext may be risky — consider OpenNext fallback

Finding ID: `migration-vinext-recommended`

**How to fix:**

1. Consider opennext as fallback. Run suggested commands manually:
npx vinext check
npx vinext init --platform=cloudflare
npm run build:vinext
npx @vinext/cloudflare deploy --dry-run

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: migration-vinext-recommended
- Category: migration
- Severity: medium
- Title: vinext may be risky — consider OpenNext fallback
- Description: Middleware, API routes, or runtime blockers suggest opennext may be safer than vinext.
- Requires human approval: yes — propose the change and wait for review before applying risky edits.

## Evidence
- npx vinext check
npx vinext init --platform=cloudflare
npm run build:vinext
npx @vinext/cloudflare deploy --dry-run

## Recommended fix guidance
1. Consider opennext as fallback. Run suggested commands manually:
npx vinext check
npx vinext init --platform=cloudflare
npm run build:vinext
npx @vinext/cloudflare deploy --dry-run

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [LOW] No security headers configuration detected

Finding ID: `security-6`

**How to fix:**

1. Add security headers (CSP, HSTS, X-Frame-Options) via Cloudflare Transform Rules or _headers file.

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: security-6
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
- Project: Next.js Fixture App
- Framework: nextjs
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
- Project: Next.js Fixture App
- Framework: nextjs
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

### [MEDIUM] API routes without OpenAPI documentation

Finding ID: `ai-api-openapi`

**How to fix:**

1. Run cf-ready fix --ai-readiness to generate a draft openapi.json.
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
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: ai-api-openapi
- Category: ai-readiness
- Severity: medium
- Title: API routes without OpenAPI documentation
- Description: 1 API route(s) detected without OpenAPI spec.

## Evidence
- /api/upload

## Recommended fix guidance
1. Run cf-ready fix --ai-readiness to generate a draft openapi.json.
2. Review and commit the generated file.

## cf-ready command (optional)
cf-ready fix --ai-readiness

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [LOW] No MCP server card

Finding ID: `ai-mcp-card`

**How to fix:**

1. Run cf-ready fix --ai-readiness to generate a draft mcp-server-card.json.
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
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: ai-mcp-card
- Category: ai-readiness
- Severity: low
- Title: No MCP server card
- Description: mcp-server-card.json not found for agent discovery.

## Recommended fix guidance
1. Run cf-ready fix --ai-readiness to generate a draft mcp-server-card.json.
2. Review and commit the generated file.

## cf-ready command (optional)
cf-ready fix --ai-readiness

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Missing Page title

Finding ID: `seo-missing-page-title`

**How to fix:**

1. Add Page title to your layout or page metadata.
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
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: seo-missing-page-title
- Category: seo
- Severity: medium
- Title: Missing Page title
- Description: Page title not detected in scanned files.

## Recommended fix guidance
1. Add Page title to your layout or page metadata.
2. Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

## cf-ready command (optional)
cf-ready fix --seo

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Missing Meta description

Finding ID: `seo-missing-meta-description`

**How to fix:**

1. Add Meta description to your layout or page metadata.
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
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: seo-missing-meta-description
- Category: seo
- Severity: medium
- Title: Missing Meta description
- Description: Meta description not detected in scanned files.

## Recommended fix guidance
1. Add Meta description to your layout or page metadata.
2. Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.

## cf-ready command (optional)
cf-ready fix --seo

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
- Project: Next.js Fixture App
- Framework: nextjs
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
- Project: Next.js Fixture App
- Framework: nextjs
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

### [MEDIUM] Missing Canonical URL

Finding ID: `seo-missing-canonical`

**How to fix:**

1. Add Canonical URL to your layout or page metadata.
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
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: seo-missing-canonical
- Category: seo
- Severity: medium
- Title: Missing Canonical URL
- Description: Canonical URL not detected in scanned files.

## Recommended fix guidance
1. Add Canonical URL to your layout or page metadata.
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
- Project: Next.js Fixture App
- Framework: nextjs
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
- Project: Next.js Fixture App
- Framework: nextjs
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

### [LOW] Missing robots.txt

Finding ID: `seo-missing-robots-txt`

**How to fix:**

1. Run cf-ready fix --seo to generate a draft robots.txt.
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
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: seo-missing-robots-txt
- Category: seo
- Severity: low
- Title: Missing robots.txt
- Description: robots.txt helps control crawler access.

## Recommended fix guidance
1. Run cf-ready fix --seo to generate a draft robots.txt.
2. Review and commit the generated file.

## cf-ready command (optional)
cf-ready fix --seo

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Environment variables not documented

Finding ID: `deployment-26`

**How to fix:**

1. Add .env.example listing required variables for Cloudflare deployment.

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: deployment-26
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

### [BLOCKER] Homepage unreachable

Finding ID: `deployment-27`

**How to fix:**

1. Fix deployment and DNS before go-live.

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: deployment-27
- Category: deployment
- Severity: blocker
- Title: Homepage unreachable
- Description: fetch failed
- Requires human approval: yes — propose the change and wait for review before applying risky edits.

## Recommended fix guidance
1. Fix deployment and DNS before go-live.

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] /robots.txt check failed

Finding ID: `deployment-28`

**How to fix:**

1. Ensure /robots.txt is deployed and accessible.

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: deployment-28
- Category: deployment
- Severity: medium
- Title: /robots.txt check failed
- Description: fetch failed

## Recommended fix guidance
1. Ensure /robots.txt is deployed and accessible.

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] /sitemap.xml check failed

Finding ID: `deployment-29`

**How to fix:**

1. Ensure /sitemap.xml is deployed and accessible.

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: deployment-29
- Category: deployment
- Severity: medium
- Title: /sitemap.xml check failed
- Description: fetch failed

## Recommended fix guidance
1. Ensure /sitemap.xml is deployed and accessible.

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] /llms.txt check failed

Finding ID: `deployment-30`

**How to fix:**

1. Ensure /llms.txt is deployed and accessible.

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: deployment-30
- Category: deployment
- Severity: medium
- Title: /llms.txt check failed
- Description: fetch failed

## Recommended fix guidance
1. Ensure /llms.txt is deployed and accessible.

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] /api/upload check failed

Finding ID: `deployment-31`

**How to fix:**

1. Ensure /api/upload is deployed and accessible.

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: deployment-31
- Category: deployment
- Severity: medium
- Title: /api/upload check failed
- Description: fetch failed

## Recommended fix guidance
1. Ensure /api/upload is deployed and accessible.

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````

### [MEDIUM] Missing security headers

Finding ID: `security-32`

**How to fix:**

1. Configure security headers via Cloudflare Transform Rules or origin.

**AI agent prompt** (copy-paste into Cursor, Claude, ChatGPT, Copilot, etc.):

````
You are helping me fix a Cloudflare Go-Live Readiness (cf-ready) finding.
Apply a minimal, production-safe change. Do not deploy. Do not modify unrelated files.
Prefer Cloudflare Workers/Pages patterns. Flag anything that needs human review (auth, payments, data).

## Project context
- Project: Next.js Fixture App
- Framework: nextjs
- Package manager: npm
- Deployment target: unknown

## Finding
- ID: security-32
- Category: security
- Severity: medium
- Title: Missing security headers
- Description: Missing: strict-transport-security, x-content-type-options, x-frame-options, content-security-policy

## Recommended fix guidance
1. Configure security headers via Cloudflare Transform Rules or origin.

## Your task
1. Inspect the cited files in this repository.
2. Implement or draft the fix following the guidance above.
3. Summarize what changed and any remaining manual steps (secrets, dashboard bindings, deploy).
4. If a safe asset can be generated instead (robots.txt, llms.txt, sitemap), prefer that over invasive refactors.
````
