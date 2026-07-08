# Deploy to Cloudflare Pages

This guide deploys the **cf-ready** documentation site (`docs/`) to Cloudflare Pages at `ready.orangecloud.vn`.

## Prerequisites

1. A [Cloudflare account](https://dash.cloudflare.com/sign-up)
2. Your **Account ID** (Cloudflare dashboard → any zone → right sidebar)
3. An **API token** with **Workers Scripts — Edit** (and **Account — Read**)

Create a token: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/

Recommended template: **Edit Cloudflare Workers**

## Option A — GitHub Actions (recommended)

Add these repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|--------|
| `CLOUDFLARE_API_TOKEN` | API token with Workers Scripts Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

Then either:

- **Merge to `main`** — the [deploy workflow](.github/workflows/deploy-pages.yml) runs automatically when `docs/` changes
- **Manual run** — Actions → *Deploy to Cloudflare* → *Run workflow*

Docs deploy as a **Cloudflare Worker with static assets** (`wrangler deploy`), available at `https://cf-ready-docs.<subdomain>.workers.dev`.

## Option B — Deploy from your machine

```bash
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"

npm install
npm run pages:deploy
```

## Custom domain

After the first deploy:

1. Cloudflare dashboard → **Workers & Pages** → **cf-ready-docs**
2. **Settings** → **Domains & Routes** → Add `ready.orangecloud.vn`
3. Update DNS if the zone is on Cloudflare

## Verify

```bash
curl -I https://cf-ready-docs.<your-subdomain>.workers.dev
# or after custom domain:
curl -I https://ready.orangecloud.vn
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `CLOUDFLARE_API_TOKEN` not set | Export token or add GitHub secret |
| API error on deploy | Token needs **Account → Workers Scripts → Edit** |
| Pages project error | This project uses Workers static assets (`wrangler deploy`), not Pages |

## Workers AI (GPT optimize API)

The deployed worker includes:

- `POST /api/optimize` — AI refactor/migration suggestions
- `GET /api/health` — health check
- Static docs at `/`

### Enable GPT models

1. Load [AI Gateway Unified Billing credits](https://developers.cloudflare.com/ai-gateway/features/unified-billing/)
2. Default model: `openai/gpt-4o-mini` (configurable via `DEFAULT_AI_MODEL` var)
3. Fallback: `@cf/meta/llama-3.1-8b-instruct-fast` (Workers AI)

### Optional API auth

```bash
npx wrangler secret put AI_API_KEY
```

Then pass to CLI:

```bash
cf-ready ai-optimize --ai-token "$AI_API_KEY"
```

### CLI usage

```bash
cf-ready scan
cf-ready ai-optimize --focus migration
cf-ready ai-optimize --model openai/gpt-4o
```
