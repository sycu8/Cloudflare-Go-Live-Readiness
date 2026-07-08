# Deploy cf-ready (Worker + Web Agent)

## Prerequisites

- Cloudflare account with Workers, R2, KV, Containers (Sandbox), and Workers AI enabled
- `CLOUDFLARE_API_TOKEN` with Workers, R2, KV permissions
- `CLOUDFLARE_ACCOUNT_ID`
- Docker (for local Sandbox dev and container image builds)

## Build & deploy

```bash
npm ci
npm run pages:deploy
```

This runs:

1. `tsup` — bundle CLI to `dist/`
2. `scripts/build-public.mjs` — copy `docs/` + build `web/` → `public/`
3. `wrangler deploy` — Worker API, Sandbox container, static assets

## Web Agent (`/app/`)

- **Upload ZIP** — drag & drop project source (max 50MB)
- **GitHub public URL** — import via tarball
- **Connect GitHub** — OAuth for private repos (set secrets below)
- **Web CLI** — terminal + chat to run `scan`, `security-scan`, `ai-optimize`, etc.

### Session API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions` | POST | Create session |
| `/api/sessions/:id/upload` | POST | Multipart ZIP |
| `/api/sessions/:id/import/github` | POST | `{ repoUrl }` |
| `/api/sessions/:id/exec` | POST | `{ line: "scan" }` |
| `/api/sessions/:id/chat` | POST | Natural language → command |
| `/api/sessions/:id/status` | GET | Session status |
| `/api/sessions/:id/results` | GET | Last scan results |

## Secrets & vars

```bash
wrangler secret put AI_API_KEY          # optional Bearer for /api/optimize
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put GITHUB_WEBHOOK_SECRET
```

Set in dashboard or `wrangler.jsonc` vars:

- `GITHUB_REDIRECT_URI` — `https://<worker>/api/auth/github/callback`
- `WORKER_PUBLIC_URL` — public worker URL for AI optimize callbacks

## GitHub OAuth App

1. Create OAuth App at https://github.com/settings/developers
2. Callback URL: `https://cf-ready-docs.<account>.workers.dev/api/auth/github/callback`
3. Store `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as Worker secrets

## GitHub push webhook (auto PDF on new commits)

When a session imports a GitHub repo, it subscribes to push events for that repository. Configure a webhook on the repo (or org):

- **Payload URL:** `https://<worker>/api/webhooks/github`
- **Content type:** `application/json`
- **Secret:** same value as Worker secret `GITHUB_WEBHOOK_SECRET`
- **Events:** `push`

On each push, linked sessions re-import the repo, run `scan`, and cache a fresh PDF in R2.

## PDF reports (R2 cache)

- `GET /api/sessions/:id/reports/pdf` — download cached PDF (generates on first request)
- `POST /api/sessions/:id/reports/generate` — force regenerate and refresh R2 cache
- Objects stored in R2 bucket `cf-ready-uploads` under `reports/{sessionId}/{hash}/cf-ready-report.pdf`
- CLI `cf-ready scan` also writes `cf-ready-report.pdf` locally

## Local development

```bash
npm run build:all
docker info   # Sandbox requires Docker
npm run dev:web
```

Visit `http://localhost:8787/app/` for the Web Agent.

## Option A — GitHub Actions (recommended)

Push to `main` triggers [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) when `workers/`, `web/`, `public/`, `docs/`, or `wrangler.jsonc` change.

Required repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Sandbox container fails | Ensure Docker is running; rebuild with `wrangler deploy` |
| KV namespace invalid | Run `wrangler kv namespace create SESSIONS` and update `wrangler.jsonc` |
| R2 bucket missing | Run `wrangler r2 bucket create cf-ready-uploads` |
| GitHub OAuth 501 | Set `GITHUB_CLIENT_ID` and `GITHUB_REDIRECT_URI` |
| AI optimize fails in sandbox | Set `WORKER_PUBLIC_URL` to your deployed worker URL |
