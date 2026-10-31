#!/usr/bin/env node
/**
 * Validate wrangler.jsonc with `wrangler deploy --dry-run`.
 *
 * Container images are not built (`--containers-rollout=none`): that step needs
 * Docker and is not what rejects assets.run_worker_first. Route checks still run.
 * Wrangler 4 requires Node.js >= 22. The Vitest wrapper skips this on older CI nodes.
 *
 * Usage: npm run test:wrangler-dry-run
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(path.join(root, "public"), { recursive: true });

const wrangler = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const outdir = path.join(tmpdir(), `cf-ready-dry-run-${process.pid}`);

execFileSync(
  process.execPath,
  [
    wrangler,
    "deploy",
    "--dry-run",
    "--containers-rollout=none",
    "--outdir",
    outdir,
  ],
  { cwd: root, stdio: "inherit" },
);
