# Contributing to Cloudflare Go-Live Readiness

Thank you for contributing to `@orangecloud/cf-ready`.

## Development setup

```bash
git clone https://github.com/sycu8/cloudflare-go-live-readiness.git
cd cloudflare-go-live-readiness
npm install
npm run build
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build CLI to `dist/` |
| `npm run dev` | Watch mode build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Run Vitest |
| `npm run test:integration` | Integration tests |

## Local testing

```bash
npm run build
node dist/cli/index.js scan --cwd tests/fixtures/nextjs-app
node dist/cli/index.js inspect --cwd tests/fixtures/vite-app --json
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
- Documentation

## Code style

- TypeScript strict mode
- ESM modules
- Prefer small composable functions
- Read-only by default — never modify source unless `fix` command

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
