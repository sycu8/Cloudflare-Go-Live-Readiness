# Cloudflare Go-Live Readiness

**Cloudflare Go-Live Readiness** helps developers move from finished code to production-ready Cloudflare deployment with migration checks, security scanning, AI readiness, SEO readiness, and go-live reporting.

CLI package:

```bash
@orangecloud/cf-ready
```

CLI command:

```bash
cf-ready
```

Suggested docs site:

```text
ready.orangecloud.vn
```

---

## Why this exists

Shipping a website or application is no longer just about running `npm run build` and deploying.

Before a real production launch, developers usually need to answer questions like:

* Can this app run properly on Cloudflare Workers or Cloudflare Pages?
* If this is a Next.js app, should it use vinext, OpenNext, Pages, Workers, or another path?
* Are there runtime blockers such as `fs`, `child_process`, native modules, local filesystem writes, or long-running processes?
* Are secrets, API keys, database URLs, or Cloudflare tokens exposed?
* Are there dependency vulnerabilities?
* Is `robots.txt` configured?
* Is `sitemap.xml` available?
* Is the site ready for AI crawlers and AI agents?
* Does the project include `llms.txt`, OpenAPI docs, or MCP discovery files where useful?
* Is SEO metadata complete?
* Are go-live, rollback, and smoke-test reports ready?

Most teams handle these checks manually, across many disconnected tools.

**Cloudflare Go-Live Readiness** turns this into one repeatable local workflow.

---

## What it does

`cf-ready` inspects a repository and generates a go-live readiness report across six areas:

1. **Migration readiness**
2. **Security readiness**
3. **AI readiness**
4. **SEO readiness**
5. **Deployment readiness**
6. **Post-deployment smoke testing**

It is designed for:

* individual developers;
* agencies and freelancers;
* Cloudflare partners and resellers;
* internal DevOps and engineering teams;
* teams migrating from Vercel, Netlify, VPS, Docker, or legacy hosting to Cloudflare.

---

## Safety model

The CLI is safe by default.

By default, `cf-ready`:

* does not deploy your application;
* does not migrate your project automatically;
* does not run `vinext init` automatically;
* does not modify source files;
* does not delete files;
* does not change secrets;
* does not change auth, payment, database, or routing logic.

File changes only happen when you explicitly run a fix command, such as:

```bash
cf-ready fix --ai-readiness
cf-ready fix --seo
```

Even then, the tool should only generate safe readiness assets such as:

* `robots.txt`;
* `sitemap.xml`;
* `llms.txt`;
* `llms-full.txt`;
* OpenAPI draft;
* MCP server card draft;
* SEO metadata suggestions;
* report files.

Risky changes should always require human review.

---

## Installation

Run directly with `npx`:

```bash
npx @orangecloud/cf-ready scan
```

Or install globally:

```bash
npm install -g @orangecloud/cf-ready
cf-ready scan
```

You can also use it inside a project:

```bash
npm install -D @orangecloud/cf-ready
npx cf-ready scan
```

---

## Quick start

From your project root:

```bash
npx @orangecloud/cf-ready scan
```

Example output:

```text
Cloudflare Go-Live Readiness Report

Project: my-app
Framework: Next.js
Router: App Router
Current target: Vercel
Recommended target: Cloudflare Workers via vinext
Overall readiness: 72/100

Migration: 68/100
Security: 74/100
AI readiness: 40/100
SEO: 65/100
Deployment: 80/100

Blockers:
- fs.writeFileSync detected in app/api/upload/route.ts
- .env.local is present and may contain secrets

Auto-fixes available:
- Generate robots.txt
- Generate llms.txt
- Generate sitemap.xml
- Generate OpenAPI draft

Reports generated:
- cf-ready-report.md
- cf-ready-report.json
- migration-plan.md
- ai-readiness-report.md
- seo-readiness-report.md
- go-live-checklist.md
```

---

## CLI commands

### Scan everything

```bash
cf-ready scan
```

Runs the default readiness scan:

* repository inspection;
* migration readiness;
* security readiness;
* AI readiness;
* SEO readiness;
* deployment readiness;
* report generation.

---

### Inspect repository

```bash
cf-ready inspect
```

Detects:

* framework;
* package manager;
* deployment target;
* important config files;
* Cloudflare config;
* routes;
* API routes;
* environment files;
* scripts;
* runtime blockers.

---

### Generate migration plan

```bash
cf-ready migration-plan
```

Generates a Cloudflare migration plan.

For Next.js apps, it may recommend:

```bash
npx vinext check
npx vinext init --platform=cloudflare
npm run build:vinext
npx @vinext/cloudflare deploy --dry-run
```

The CLI should not run migration automatically in the MVP.

---

### Run security scan

```bash
cf-ready security-scan
```

Checks for:

* exposed `.env` files;
* missing `.gitignore` protection;
* hardcoded secrets;
* Cloudflare tokens;
* API keys;
* private keys;
* JWT secrets;
* database URLs;
* unsafe CORS patterns;
* risky public files;
* source maps in public output;
* dependency audit availability.

Future integrations may include:

* Semgrep;
* CodeQL;
* Trivy;
* Gitleaks;
* OWASP ZAP;
* Lighthouse CI.

---

### Check AI readiness

```bash
cf-ready ai-ready
```

Checks for:

* `public/robots.txt`;
* `public/sitemap.xml`;
* `public/llms.txt`;
* `public/llms-full.txt`;
* OpenAPI files;
* API docs;
* MCP server card;
* `auth.md`;
* API routes that need documentation.

---

### Generate AI readiness files

```bash
cf-ready fix --ai-readiness
```

Safely generates missing AI-readiness assets, such as:

* `public/robots.txt`;
* `public/llms.txt`;
* `public/llms-full.txt`;
* `public/sitemap.xml`;
* `openapi.json` draft;
* `mcp-server-card.json` draft;
* `auth.md` draft.

Generated files should be useful defaults, not empty placeholders.

---

### Check SEO readiness

```bash
cf-ready seo-ready
```

Checks for:

* title;
* meta description;
* canonical URL;
* Open Graph metadata;
* Twitter/X card metadata;
* sitemap;
* robots;
* JSON-LD structured data;
* heading hierarchy;
* image alt text;
* internal links where practical;
* rendering hints for Next.js and Vite apps.

---

### Generate SEO readiness assets

```bash
cf-ready fix --seo
```

Safely generates or suggests:

* sitemap draft;
* metadata helper suggestions;
* Open Graph defaults;
* JSON-LD organization schema draft;
* canonical URL helper suggestions;
* image alt warnings.

---

### Generate reports

```bash
cf-ready report
```

Generates report files from the latest scan context.

Expected reports:

```text
cf-ready-report.md
cf-ready-report.json
migration-plan.md
security-findings.sarif
ai-readiness-report.md
seo-readiness-report.md
go-live-checklist.md
rollback-plan.md
deployment-manifest.json
```

---

### Check deployment readiness

```bash
cf-ready deploy-check
```

Checks:

* build script;
* dev script;
* start script;
* lint script;
* typecheck script;
* test script;
* Cloudflare config;
* environment variable documentation;
* blocker findings;
* migration path;
* rollback plan;
* deployment manifest.

---

### Run smoke test

```bash
cf-ready smoke-test --url https://example.com
```

Checks:

* homepage status;
* `robots.txt`;
* `sitemap.xml`;
* `llms.txt`;
* redirect behavior;
* security headers;
* basic response time;
* configured critical routes.

---

### AI optimize (Workers AI + GPT)

```bash
cf-ready ai-optimize
cf-ready ai-optimize --focus migration
cf-ready ai-optimize --model openai/gpt-4o
```

Uses your deployed **Cloudflare Worker** with **Workers AI** and **AI Gateway** to analyze scan findings and code snippets, then returns prioritized refactor steps for Cloudflare Workers/Pages.

Requirements:

* Cloudflare **AI Gateway Unified Billing** credits (for `openai/gpt-4o-mini`, `openai/gpt-4o`, etc.)
* Deployed worker at `ai.workerUrl` in `cf-ready.config.json` (default: production worker)
* Optional `ai.apiToken` if the worker enforces `AI_API_KEY`

Output: `cf-ready-ai-optimize.md`

---

## Configuration

You can add an optional config file:

```text
cf-ready.config.json
```

General example:

```json
{
  "projectName": "My App",
  "productionUrl": "https://example.com",
  "target": "cloudflare-workers",
  "aiPolicy": "allow-assistive-agents",
  "seo": {
    "defaultTitle": "My App",
    "defaultDescription": "My App description"
  },
  "criticalRoutes": ["/", "/login", "/api/health"]
}
```

---

## Next.js example config

```json
{
  "projectName": "Next.js Cloudflare App",
  "productionUrl": "https://example.com",
  "framework": "nextjs",
  "target": "cloudflare-workers",
  "migration": {
    "preferredPath": "vinext",
    "fallbackPath": "opennext",
    "allowAutoMigration": false
  },
  "aiPolicy": "allow-assistive-agents",
  "seo": {
    "defaultTitle": "Next.js Cloudflare App",
    "defaultDescription": "A production-ready Next.js application prepared for Cloudflare deployment.",
    "defaultImage": "/og.png",
    "organizationName": "OrangeCloud"
  },
  "criticalRoutes": ["/", "/login", "/dashboard", "/api/health"],
  "security": {
    "blockOnSecrets": true,
    "blockOnCriticalDependencies": true
  }
}
```

---

## Vite example config

```json
{
  "projectName": "Vite Cloudflare Site",
  "productionUrl": "https://example.com",
  "framework": "vite",
  "target": "cloudflare-pages",
  "migration": {
    "preferredPath": "cloudflare-pages",
    "allowAutoMigration": false
  },
  "aiPolicy": "allow-assistive-agents",
  "seo": {
    "defaultTitle": "Vite Cloudflare Site",
    "defaultDescription": "A fast static website prepared for Cloudflare Pages.",
    "defaultImage": "/og.png",
    "organizationName": "OrangeCloud"
  },
  "criticalRoutes": ["/", "/about", "/contact"],
  "security": {
    "blockOnSecrets": true,
    "blockOnCriticalDependencies": true
  }
}
```

---

## Static site example config

```json
{
  "projectName": "Static Cloudflare Site",
  "productionUrl": "https://example.com",
  "framework": "static",
  "target": "cloudflare-pages",
  "aiPolicy": "allow-assistive-agents",
  "seo": {
    "defaultTitle": "Static Cloudflare Site",
    "defaultDescription": "A static website prepared for Cloudflare Pages and AI discovery.",
    "defaultImage": "/og.png",
    "organizationName": "OrangeCloud"
  },
  "criticalRoutes": ["/", "/about", "/contact"],
  "security": {
    "blockOnSecrets": true,
    "blockOnCriticalDependencies": true
  }
}
```

---

## What the tool detects

### Frameworks

`cf-ready` should detect:

* Next.js;
* Vite;
* React SPA;
* Astro;
* Remix;
* Nuxt;
* Express;
* Node.js;
* static sites;
* unknown legacy apps.

### Package managers

It should detect:

* npm;
* pnpm;
* yarn;
* bun.

### Deployment targets

It should detect:

* Vercel;
* Netlify;
* Docker/VPS;
* Cloudflare Pages;
* Cloudflare Workers;
* unknown deployment targets.

### Important files

It checks for files such as:

```text
package.json
package-lock.json
pnpm-lock.yaml
yarn.lock
bun.lockb
next.config.js
next.config.mjs
vite.config.ts
vite.config.js
wrangler.toml
wrangler.jsonc
.env
.env.local
.gitignore
Dockerfile
.github/workflows/*
public/robots.txt
public/sitemap.xml
public/llms.txt
public/llms-full.txt
cf-ready.config.json
```

---

## Migration readiness

Migration readiness is the highest-priority check.

The tool should help answer:

* Can this project run on Cloudflare?
* Which Cloudflare target fits best?
* Are there runtime blockers?
* Is vinext appropriate?
* Is OpenNext safer?
* Should this stay on legacy hosting with Cloudflare in front first?
* What needs to be refactored before deployment?

### Next.js migration

For Next.js apps, the tool should detect:

* App Router;
* Pages Router;
* API routes;
* route handlers;
* middleware;
* server components;
* Next.js config;
* runtime blockers;
* unsupported deployment patterns.

It may recommend:

```bash
npx vinext check
npx vinext init --platform=cloudflare
npm run build:vinext
npx @vinext/cloudflare deploy --dry-run
```

The tool should not run these migration commands automatically in the MVP.

### Vite / React SPA

For Vite or static React apps, it may recommend:

* Cloudflare Pages;
* Workers Assets;
* simple static deployment;
* preview deployment workflow.

### Express / Node.js

For Express or Node.js apps, it should detect whether the app depends on:

* long-running servers;
* Node-specific APIs;
* local filesystem writes;
* TCP/network modules;
* native modules;
* stateful runtime behavior.

It may recommend:

* Hono;
* Cloudflare Workers-native routing;
* progressive refactor;
* keeping Cloudflare in front first.

### Legacy / unknown apps

For legacy or unknown stacks, it may recommend placing Cloudflare in front first:

* DNS;
* CDN;
* WAF;
* cache rules;
* Turnstile;
* Zero Trust for admin routes.

Then it can suggest progressive replatforming.

---

## Runtime blockers

The tool should flag Cloudflare runtime blockers such as:

```text
fs
net
tls
child_process
cluster
worker_threads
native modules
local filesystem writes
long-running processes
stateful WebSocket logic
unsupported image/font optimization
database connection pooling patterns
direct process.env usage that needs documentation
```

---

## Security readiness

The built-in MVP security checks should detect:

* `.env` files committed or present;
* `.env` files not protected by `.gitignore`;
* obvious hardcoded secrets;
* Cloudflare tokens;
* API keys;
* private keys;
* JWT secrets;
* database URLs;
* unsafe CORS patterns;
* missing security header configuration where detectable;
* risky public files;
* source maps in public build output;
* package audit command availability.

The architecture should allow future integrations with:

* Semgrep;
* CodeQL;
* Trivy;
* Gitleaks;
* OWASP ZAP;
* Lighthouse CI.

---

## AI readiness

AI readiness checks whether a site is easy for AI crawlers, AI search tools, and AI agents to discover and understand.

The tool checks for:

* `robots.txt`;
* `sitemap.xml`;
* `llms.txt`;
* `llms-full.txt`;
* OpenAPI docs;
* API routes;
* API catalog;
* MCP server card;
* `auth.md`;
* agent-friendly content structure.

When safe, the tool can generate:

```text
public/robots.txt
public/llms.txt
public/llms-full.txt
public/sitemap.xml
openapi.json
mcp-server-card.json
auth.md
```

---

## Example generated `llms.txt`

```txt
# Project Name

## Summary
This website/application provides a clear description of the product or service.

## Key Pages
- /
- /docs
- /api
- /contact

## API
If available, API documentation is located at /openapi.json or /api/docs.

## Usage Policy
AI agents may use this content to help users understand, navigate, and interact with this website.

## Contact
For support, visit /contact.
```

---

## Example generated `robots.txt`

```txt
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

Optional AI crawler policy:

```txt
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /
```

---

## SEO readiness

The SEO module checks:

* title;
* meta description;
* canonical URL;
* Open Graph metadata;
* Twitter/X card metadata;
* sitemap;
* robots;
* JSON-LD structured data;
* heading hierarchy;
* image alt text;
* internal links where practical;
* status code assumptions where practical;
* rendering hints for Next.js and Vite apps.

It can generate or suggest:

* sitemap draft;
* metadata helpers;
* Open Graph defaults;
* JSON-LD organization schema draft;
* canonical URL helper suggestions;
* image alt warnings.

---

## Deployment readiness

Deployment readiness checks:

* build script;
* dev script;
* start script;
* lint script;
* typecheck script;
* test script;
* Cloudflare config;
* environment variable documentation;
* blocker findings;
* migration path;
* rollback plan;
* deployment manifest.

---

## Readiness score

Default weighted scoring:

| Category             | Weight |
| -------------------- | -----: |
| Migration readiness  |    35% |
| Security readiness   |    30% |
| AI readiness         |    20% |
| SEO readiness        |    10% |
| Deployment readiness |     5% |

Severity levels:

```text
blocker
high
medium
low
info
passed
```

Deployment rules:

* Any `blocker` blocks production readiness.
* Critical security issues block production readiness.
* AI and SEO issues do not block by default unless configured.
* Risk acceptance should be represented in the report.

---

## Finding model

Each finding should use this structure:

```ts
type Finding = {
  id: string;
  category:
    | "migration"
    | "security"
    | "ai-readiness"
    | "seo"
    | "deployment"
    | "observability";
  severity: "blocker" | "high" | "medium" | "low" | "info" | "passed";
  title: string;
  description: string;
  evidence?: string;
  affectedFiles?: string[];
  recommendation: string;
  autoFixAvailable: boolean;
  requiresApproval: boolean;
  status: "open" | "fixed" | "accepted-risk" | "ignored";
};
```

---

## Reports generated

The tool should generate:

```text
cf-ready-report.md
cf-ready-report.json
migration-plan.md
security-findings.sarif
ai-readiness-report.md
seo-readiness-report.md
go-live-checklist.md
rollback-plan.md
deployment-manifest.json
```

---

## Suggested project structure

```text
src/
  cli/
    index.ts
    commands/
      scan.ts
      inspect.ts
      migration-plan.ts
      security-scan.ts
      ai-ready.ts
      seo-ready.ts
      fix.ts
      report.ts
      deploy-check.ts
      smoke-test.ts
  core/
    context.ts
    findings.ts
    scoring.ts
    report.ts
    filesystem.ts
  inspectors/
    repository.ts
    framework.ts
    package-manager.ts
    deployment.ts
    routes.ts
    cloudflare.ts
  modules/
    migration/
      index.ts
      nextjs.ts
      vite.ts
      node.ts
      legacy.ts
    security/
      index.ts
      secrets.ts
      env.ts
      cors.ts
      headers.ts
      dependencies.ts
    ai-readiness/
      index.ts
      robots.ts
      llms.ts
      sitemap.ts
      openapi.ts
      mcp.ts
      auth-doc.ts
    seo/
      index.ts
      metadata.ts
      structured-data.ts
      links.ts
      images.ts
    deployment/
      index.ts
      scripts.ts
      cloudflare-config.ts
      env-docs.ts
      rollback.ts
    smoke-test/
      index.ts
      http.ts
      headers.ts
  generators/
    markdown-report.ts
    json-report.ts
    sarif.ts
    ai-assets.ts
    seo-assets.ts
  config/
    default-rules.ts
    schema.ts
  utils/
    path.ts
    logger.ts
    package-json.ts
examples/
  nextjs/
    cf-ready.config.json
  vite/
    cf-ready.config.json
tests/
  fixtures/
    nextjs-app/
    vite-app/
    express-app/
    static-site/
  unit/
  integration/
README.md
LICENSE
package.json
```

---

## Roadmap

### Phase 1: Production CLI

* repository inspection;
* finding model;
* scoring;
* report generation;
* migration readiness;
* lightweight security checks;
* AI readiness checks;
* SEO readiness checks;
* safe AI/SEO file generation;
* deployment readiness checks;
* smoke test command.

### Phase 2: GitHub Action

* run on pull requests;
* comment readiness summary;
* upload SARIF;
* upload reports;
* block production readiness on blockers.

### Phase 3: Auto-fix pull request

* create branch;
* generate safe fixes;
* open pull request;
* include report;
* require review for risky changes.

### Phase 4: Web dashboard

* connect repositories;
* scan history;
* readiness score;
* report viewer;
* project settings;
* approval workflow;
* team/client reporting.

### Phase 5: Cloudflare deployment assistant

* validate Cloudflare config;
* preview deploy support;
* production go-live checklist;
* post-deploy smoke test;
* rollback workflow.

---

## Non-goals for MVP

The MVP should not:

* deploy production automatically;
* migrate projects automatically;
* run `vinext init` automatically;
* change auth, payment, database, or routing logic;
* require external APIs;
* require Cloudflare API access;
* require a dashboard;
* make destructive changes;
* hide risky changes from the user.

---

## Contributing

Contributions are welcome.

Good first contribution areas:

* framework detection;
* security rule improvements;
* AI-readiness generators;
* SEO checks;
* Cloudflare config validation;
* test fixtures;
* report templates;
* documentation.

Recommended workflow:

```bash
git clone https://github.com/orangecloud/cloudflare-go-live-readiness.git
cd cloudflare-go-live-readiness
npm install
npm run dev
npm test
```

Before opening a pull request:

```bash
npm run typecheck
npm run lint
npm test
```

Please keep changes small, focused, and well documented.

---

## License

MIT License.

---

## Status

**v0.1.0** — Production CLI MVP

The CLI is read-only by default. It does not deploy, does not automatically migrate projects, and only modifies files when explicit `fix` commands are used.

See [CHANGELOG.md](CHANGELOG.md) for release notes and [CONTRIBUTING.md](CONTRIBUTING.md) to contribute.

Deploy the docs site to Cloudflare Pages: [DEPLOY.md](DEPLOY.md)
