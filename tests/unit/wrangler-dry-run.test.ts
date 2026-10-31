import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Wrangler 4 (devDependency) declares engines.node >= 22. CI still runs the
// rest of the suite on Node 18 and 20, where this dry-run cannot start.
const nodeMajor = Number(process.versions.node.split(".")[0]);

describe("wrangler deploy --dry-run", () => {
  it.skipIf(nodeMajor < 22)("accepts assets.run_worker_first", () => {
    expect(() =>
      execFileSync(process.execPath, [path.join(root, "scripts/wrangler-dry-run.mjs")], {
        cwd: root,
        stdio: "inherit",
        timeout: 120_000,
      }),
    ).not.toThrow();
  }, 120_000);
});
