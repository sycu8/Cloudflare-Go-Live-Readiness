# CF Ready GitHub Action

Composite action that runs `@orangecloud/cf-ready` on CI / pull requests, uploads SARIF, and exposes score outputs.

## Consumers (recommended)

```yaml
- uses: sycu8/Cloudflare-Go-Live-Readiness/action@v0.3.3
  with:
    cwd: .
    fail-on-blocker: "true"
    install-from: npm
    package-version: "0.3.3"
```

## Safe fix PR (Phase 3)

Open a PR with AI/SEO draft assets only (never auto-merge):

```yaml
- uses: sycu8/Cloudflare-Go-Live-Readiness/action/fix@v0.3.3
  with:
    cwd: .
    package-version: "0.3.3"
```

Full example: [`examples/github-action-safe-fix.yml`](../examples/github-action-safe-fix.yml).

## Vendoring / dogfood (this repo)

```yaml
- uses: ./action
  with:
    cwd: tests/fixtures/nextjs-app
    fail-on-blocker: "false"
    install-from: source
    cf-ready-root: .
```

## Version tags

```bash
git tag v0.3.3
git tag -f v0.3
git push origin v0.3.3 v0.3
```

## Marketplace

Submit/update the GitHub Marketplace listing from the repository Releases UI after tagging.

## Branch protection

1. Require the readiness job with `fail-on-blocker: "true"`.
2. Optionally require SARIF upload / code scanning alerts.
