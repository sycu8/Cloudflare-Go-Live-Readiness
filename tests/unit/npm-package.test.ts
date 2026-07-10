import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("npm package metadata", () => {
  it("ships CLI-only runtime dependencies", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      name: string;
      dependencies?: Record<string, string>;
      publishConfig?: { access?: string };
    };
    expect(pkg.name).toBe("@orangecloud/cf-ready");
    expect(pkg.publishConfig?.access).toBe("public");
    expect(pkg.dependencies).not.toHaveProperty("@cloudflare/sandbox");
    expect(pkg.dependencies).toHaveProperty("commander");
    expect(pkg.dependencies).toHaveProperty("zod");
  });
});
