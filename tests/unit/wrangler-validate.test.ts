import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  loadWranglerConfig,
  validateWranglerConfig,
  generatePostDeployChecklist,
} from "../../src/modules/deployment/wrangler-validate.js";
import { inspectRepository } from "../../src/inspectors/repository.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("wrangler validation", () => {
  it("loads complete wrangler.toml fixture", async () => {
    const config = await loadWranglerConfig(path.join(fixtures, "wrangler-app"));
    expect(config.file).toBe("wrangler.toml");
    expect(config.name).toBe("wrangler-fixture");
    expect(config.main).toBe("src/index.ts");
    expect(config.compatibilityDate).toBe("2024-09-23");
  });

  it("passes validation for healthy wrangler fixture", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "wrangler-app"));
    const findings = await validateWranglerConfig(inspection);
    expect(findings.some((f) => f.severity === "passed")).toBe(true);
    expect(findings.every((f) => f.severity !== "high" && f.severity !== "blocker")).toBe(true);
  });

  it("flags missing compatibility_date and main", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "cf-ready-wrangler-"));
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "incomplete" }));
    writeFileSync(path.join(dir, "wrangler.toml"), 'name = "incomplete"\n');
    const inspection = await inspectRepository(dir);
    const findings = await validateWranglerConfig(inspection);
    expect(findings.some((f) => f.id === "deploy-wrangler-compat-date")).toBe(true);
    expect(findings.some((f) => f.id === "deploy-wrangler-entry")).toBe(true);
  });

  it("generatePostDeployChecklist includes smoke-test", () => {
    const md = generatePostDeployChecklist(
      {
        projectName: "demo",
        framework: "hono",
      } as never,
      "https://example.com",
    );
    expect(md).toContain("Post-deploy checklist");
    expect(md).toContain("cf-ready smoke-test --url https://example.com");
    expect(md).toContain("AI agent prompt");
  });
});
