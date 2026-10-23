import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("wrangler deploy --dry-run", () => {
  it("accepts assets.run_worker_first", () => {
    expect(() =>
      execFileSync(process.execPath, [path.join(root, "scripts/wrangler-dry-run.mjs")], {
        cwd: root,
        stdio: "inherit",
        timeout: 120_000,
      }),
    ).not.toThrow();
  }, 120_000);
});
