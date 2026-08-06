# CF Ready GitHub Action

Composite action that runs `@orangecloud/cf-ready` on CI / pull requests, uploads SARIF, and exposes score outputs.

## Consumers (recommended)

Use the published npm package (default):

```yaml
- uses: sycu8/Cloudflare-Go-Live-Readiness/action@v0.3.0
  with:
    cwd: .
    fail-on-blocker: "true"
    install-from: npm
    package-version: "0.3.0"
```

## Vendoring / dogfood (this repo)

Build from source when developing cf-ready itself:

```yaml
- uses: ./action
  with:
    cwd: tests/fixtures/nextjs-app
    fail-on-blocker: "false"
    install-from: source
    cf-ready-root: .
```

## Version tags

Tag releases that match npm when publishing:

```bash
git tag v0.3.0
git tag -f v0.3
git push origin v0.3.0 v0.3
```

## Marketplace

Submit/update the GitHub Marketplace listing from the repository Releases UI after tagging. Branding is defined in `action.yml` (`icon: cloud`, `color: orange`).

## Branch protection

1. Require the workflow job that runs this action (with `fail-on-blocker: "true"`).
2. Optionally allow soft adoption first with `fail-on-blocker: "false"` (comment/SARIF only).
3. Exit code `2` (runtime error) always fails the step.
