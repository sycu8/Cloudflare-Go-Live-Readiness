# Contributing to CF Ready

Thank you for contributing to **Cloudflare Go-Live Readiness** (`@orangecloud/cf-ready`).

- **Website:** https://ready.orangecloud.vn
- **Repository:** https://github.com/sycu8/Cloudflare-Go-Live-Readiness

## Development setup

```bash
git clone https://github.com/sycu8/Cloudflare-Go-Live-Readiness.git
cd Cloudflare-Go-Live-Readiness
npm ci
npm run build
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build CLI to `dist/` |
| `npm run build:all` | Build CLI + marketing site + Web Agent assets |
| `npm run dev` | Watch mode CLI build |
| `npm run typecheck` | TypeScript check (CLI + Workers) |
| `npm run lint` | ESLint |
| `npm test` | Run Vitest |
| `npm run test:integration` | Integration tests |
| `npm run pages:deploy` | Deploy site + Worker to Cloudflare |

## Local testing

```bash
npm run build
node dist/index.js scan --cwd tests/fixtures/nextjs-app
node dist/index.js inspect --cwd tests/fixtures/vite-app --json
```

## Pull request guidelines

1. Keep changes focused and small
2. Add or update tests for behavior changes
3. Run `npm run typecheck`, `npm run lint`, and `npm test` before opening a PR
4. Update README if CLI behavior or commands change

## Release checklist (after each feature / update)

Do this automatically when a feature lands (agent or maintainer):

1. **GitHub**
   - Update `CHANGELOG.md` with user-facing notes
   - Sync `ROADMAP.md` / docs status when the feature completes a roadmap item
   - Open/merge the feature PR; site deploy runs from `main` via `deploy-pages.yml`
2. **Version + npm (when needed)**
   - Bump `package.json` / lockfile **when** the published package changes (CLI `dist/`, `examples/`, Action defaults that pin npm) **or** when shipping a coordinated project release
   - Update Action `package-version` defaults and `action/README.md` examples
   - Add `.github/release-notes-vX.Y.Z.md`
   - After merge to `main`, publish a GitHub Release tag `vX.Y.Z` (and move `v0.3`) — that triggers `.github/workflows/publish-npm.yml`
3. **Skip npm** when the change is docs-only or Worker/site-only and you are not cutting a versioned release; still update CHANGELOG under the next Unreleased / upcoming version section

Owner-only if CI fails: ensure repo secret `NPM_TOKEN` is an npm **Automation** token for publisher `sycule`.

## Good first contributions

- Framework detection improvements
- Security rule patterns
- AI/SEO generators
- Test fixtures
- Report templates
- Documentation and brandkit (`cf-ready-brandkit/`)

## Code style

- TypeScript strict mode
- ESM modules
- Prefer small composable functions
- Read-only by default — never modify source unless `fix` command

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
