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
