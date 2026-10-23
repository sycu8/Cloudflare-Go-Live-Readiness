import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * CLI integration tests execute dist/index.js.
 * `npm run build:all` produces that bundle. Run it when a checkout has not.
 * CI builds before `npm test`, so this stays a no-op there.
 * After CLI source changes, run `npm run build:all` again; a stale dist/ is kept.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default function setup(): void {
  if (existsSync(path.join(root, "dist/index.js"))) return;
  execSync("npm run build:all", { cwd: root, stdio: "inherit" });
}
