# Deploy to Cloudflare Pages

This guide deploys the **cf-ready** documentation site (`docs/`) to Cloudflare Pages at `ready.orangecloud.vn`.

## Prerequisites

1. A [Cloudflare account](https://dash.cloudflare.com/sign-up)
2. Your **Account ID** (Cloudflare dashboard → any zone → right sidebar)
3. An **API token** with **Cloudflare Pages — Edit** permission

Create a token: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/

## Option A — GitHub Actions (recommended)

Add these repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|--------|
| `CLOUDFLARE_API_TOKEN` | API token with Pages Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

Then either:

- **Merge to `main`** — the [deploy-pages workflow](.github/workflows/deploy-pages.yml) runs automatically when `docs/` changes
- **Manual run** — Actions → *Deploy to Cloudflare Pages* → *Run workflow*

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
2. **Custom domains** → Add `ready.orangecloud.vn`
3. Update DNS (CNAME to `<project>.pages.dev`) if the zone is on Cloudflare

## Verify

```bash
curl -I https://cf-ready-docs.pages.dev
# or after DNS:
curl -I https://ready.orangecloud.vn
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `CLOUDFLARE_API_TOKEN` not set | Export token or add GitHub secret |
| Project not found | First deploy creates `cf-ready-docs` automatically |
| 403 on deploy | Token needs **Account → Cloudflare Pages → Edit** |
