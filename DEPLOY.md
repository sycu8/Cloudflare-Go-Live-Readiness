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

### Import architecture (Model B — R2 staging + Container execution)

```
GitHub/ZIP → Worker/DO fetch → R2 sources/... → Container extract → cf-ready CLI
```

| Plane | Responsibility |
|-------|----------------|
| **Import (Worker/DO)** | Fetch GitHub tarball or accept ZIP upload; stage to R2 |
| **Execution (Sandbox)** | Stream archive from R2 → write to `/tmp` → `tar`/`unzip` → `/workspace/project` |
| **Cache** | GitHub tarballs keyed by commit SHA; uploads keyed per session + content hash |

R2 object layout in bucket `cf-ready-uploads`:

| Path | Purpose |
|------|---------|
| `sources/github/{owner}/{repo}/{sha-or-ref}.tar.gz` | Shared GitHub commit cache |
| `sources/uploads/{sessionId}/{hash}.zip` | Per-session ZIP uploads |
| `reports/{sessionId}/{hash}/cf-ready-report.pdf` | Cached PDF reports |

If the Sandbox container is recycled, the session re-extracts from `sourceR2Key` on the next command.

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
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

Set in dashboard or `wrangler.jsonc` vars:

- `GITHUB_REDIRECT_URI` — `https://<worker>/api/auth/github/callback`
- `GOOGLE_REDIRECT_URI` — `https://<worker>/api/auth/google/callback`
- `WORKER_PUBLIC_URL` — public worker URL for AI optimize callbacks

## GitHub OAuth App (required for sign-in + private repos)

1. Open https://github.com/settings/developers → **New OAuth App**
2. Set:
   - **Application name:** CF Ready Agent
   - **Homepage URL:** `https://ready.orangecloud.vn`
   - **Authorization callback URL:** `https://ready.orangecloud.vn/api/auth/github/callback`
3. Copy the **Client ID** and generate a **Client secret**
4. Store them on the Worker (choose one method):

### Option A — GitHub repository secrets (recommended for CI)

In your GitHub repo → **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|--------|--------|
| `GITHUB_CLIENT_ID` | OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | OAuth App client secret |

The deploy workflow runs `scripts/set-worker-secrets.mjs` and uploads these automatically.

### Option B — Wrangler CLI (manual)

```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
```

5. Re-deploy (push to `main` or `npm run pages:deploy`)

Verify: `curl https://ready.orangecloud.vn/api/auth/config` should return `"github": true`.

## Google OAuth (account sign-in)

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create project (if needed) → **Create credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Set:
   - **Authorized JavaScript origins:** `https://ready.orangecloud.vn`
   - **Authorized redirect URIs:** `https://ready.orangecloud.vn/api/auth/google/callback`
5. Copy **Client ID** and **Client secret**

### Store Google secrets

**GitHub Actions (recommended)** — add repository secrets:

| Secret | Value |
|--------|--------|
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |

**Or manually:**

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

6. Re-deploy and verify:

```bash
curl https://ready.orangecloud.vn/api/auth/config
# expect "google": true
```

## User accounts

- Sign in via **Google** or **GitHub** at `/app/` (accounts are created on first OAuth sign-in)
- Auth session cookie: `cf_ready_auth` (HttpOnly, 30 days)
- Workspace sessions require authentication and are linked to the signed-in user in D1
- `GET /api/auth/me` — current user profile
- `POST /api/auth/logout` — sign out

## GitHub push webhook (auto PDF on new commits)

When a session imports a GitHub repo, it subscribes to push events for that repository. Configure a webhook on the repo (or org):

- **Payload URL:** `https://<worker>/api/webhooks/github`
- **Content type:** `application/json`
- **Secret:** same value as Worker secret `GITHUB_WEBHOOK_SECRET`
- **Events:** `push`

On each push, linked sessions re-import the repo, run `scan`, and cache a fresh PDF in R2.

## R2 storage (`cf-ready-uploads`)

- **Source archives** — `sources/github/...` and `sources/uploads/...` (see Model B table above)
- **PDF reports** — `reports/{sessionId}/{hash}/cf-ready-report.pdf`
- `GET /api/sessions/:id/reports/pdf` — download cached PDF (generates on first request)
- `POST /api/sessions/:id/reports/generate` — force regenerate and refresh R2 cache
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

## Workers Observability

Enabled in [`wrangler.jsonc`](wrangler.jsonc):

- **Workers Logs** — `console.log` / errors, invocation metadata (7-day retention)
- **Traces** — automatic spans for Worker, Durable Objects, and bindings

View in dashboard:

1. [Workers & Pages](https://dash.cloudflare.com/) → **cf-ready-docs** → **Observability**
2. Durable Objects → **SessionDO** / **Sandbox** → **Logs** tab

Local tail:

```bash
npx wrangler tail cf-ready-docs
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Sandbox container fails | Ensure Docker is running; rebuild with `wrangler deploy` |
| KV namespace invalid | Run `wrangler kv namespace create SESSIONS` and update `wrangler.jsonc` |
| R2 bucket missing | Run `wrangler r2 bucket create cf-ready-uploads` |
| GitHub OAuth 501 | Set `GITHUB_CLIENT_ID` and `GITHUB_REDIRECT_URI` |
| AI optimize fails in sandbox | Set `WORKER_PUBLIC_URL` to your deployed worker URL |
