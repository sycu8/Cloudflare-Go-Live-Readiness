## Web Agent

- Extend exec wait timeout to **30 minutes** (client + Durable Object poll + sandbox exec aligned)
- Skip redundant module sandbox prewarm on parallel rescans; raise module concurrency to 3
- Shared timeout constants in `src/shared/exec-timeouts.ts`

## CI / platform

- Fix Windows CI scan output path (`RUNNER_TEMP` instead of `/tmp`)
- ImgBot-optimized docs assets (~28% smaller)
- E2E production workflow skips gracefully when edge returns 403 to GitHub Actions runners

**Install:** `npm install -g @orangecloud/cf-ready@0.2.1`
