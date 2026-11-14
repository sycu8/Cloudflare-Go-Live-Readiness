import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectRepository } from "../../src/inspectors/repository.js";
import { generateMigrationPlanMarkdown, runMigrationChecks } from "../../src/modules/migration/index.js";
import { getRemediationForRule } from "../../src/config/remediation-templates.js";
import { DEFAULT_CONFIG } from "../../src/config/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "../fixtures");

describe("framework detection", () => {
  it("detects Next.js in fixture", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "nextjs-app"));
    expect(inspection.framework).toBe("nextjs");
    expect(inspection.nextJs?.router).toBe("app");
    expect(inspection.nextJs?.hasMiddleware).toBe(true);
  });

  it("detects Vite in fixture", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "vite-app"));
    expect(inspection.framework).toBe("vite");
  });

  it("detects Express in fixture", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "express-app"));
    expect(inspection.framework).toBe("express");
  });

  it("detects static site", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "static-site"));
    expect(inspection.framework).toBe("static");
  });

  it("detects Astro in fixture", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "astro-app"));
    expect(inspection.framework).toBe("astro");
    expect(inspection.astro?.outputMode).toBe("static");
    expect(inspection.astro?.hasCloudflareAdapter).toBe(false);
  });

  it("detects Remix in fixture", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "remix-app"));
    expect(inspection.framework).toBe("remix");
    expect(inspection.remix?.usesVite).toBe(true);
    expect(inspection.remix?.hasCloudflareAdapter).toBe(false);
  });

  it("detects Hono in fixture", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "hono-app"));
    expect(inspection.framework).toBe("hono");
    expect(inspection.hono?.hasNodeServer).toBe(true);
    expect(inspection.hono?.entryFiles.length).toBeGreaterThan(0);
  });
});

describe("framework migration analyzers", () => {
  it("emits specific Astro migration findings", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "astro-app"));
    const findings = await runMigrationChecks(inspection, DEFAULT_CONFIG);
    const migration = findings.filter((f) => f.category === "migration");
    expect(migration.length).toBeGreaterThanOrEqual(2);
    expect(migration.some((f) => f.id === "migration-astro-detected")).toBe(true);
    expect(migration.some((f) => f.id === "migration-astro-pages")).toBe(true);
    expect(migration.every((f) => f.id !== "migration-astro")).toBe(true);
    const astroTarget = migration.find((f) => f.id === "migration-astro-pages");
    expect(astroTarget?.title).toContain("Workers with static assets");
    expect(astroTarget?.title).not.toContain("Cloudflare Pages");
    expect(astroTarget?.recommendation).toContain("Start new projects with Workers");
    expect(astroTarget?.recommendation).toContain("Pages is still supported");
  });

  it("emits specific Remix migration findings", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "remix-app"));
    const findings = await runMigrationChecks(inspection, DEFAULT_CONFIG);
    const migration = findings.filter((f) => f.category === "migration");
    expect(migration.length).toBeGreaterThanOrEqual(2);
    expect(migration.some((f) => f.id === "migration-remix-detected")).toBe(true);
    expect(migration.some((f) => f.id === "migration-remix-adapter-missing")).toBe(true);
    const remixDetected = migration.find((f) => f.id === "migration-remix-detected");
    const remixMissing = migration.find((f) => f.id === "migration-remix-adapter-missing");
    expect(remixDetected?.recommendation).toContain("React Router (formerly Remix)");
    expect(remixMissing?.recommendation).toContain("React Router (formerly Remix)");
    expect(remixDetected?.recommendation).not.toContain("@remix-run/cloudflare");
  });

  it("emits specific Hono migration findings", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "hono-app"));
    const findings = await runMigrationChecks(inspection, DEFAULT_CONFIG);
    const migration = findings.filter((f) => f.category === "migration");
    expect(migration.length).toBeGreaterThanOrEqual(2);
    expect(migration.some((f) => f.id === "migration-hono-detected")).toBe(true);
    expect(migration.some((f) => f.id === "migration-hono-node-server")).toBe(true);
    expect(migration.some((f) => f.remediation?.docsUrl)).toBe(true);
  });

  it("recommends Workers static assets for Vite and keeps Pages as supported", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "vite-app"));
    const findings = await runMigrationChecks(inspection, DEFAULT_CONFIG);
    const vite = findings.filter((f) => f.category === "migration");
    expect(vite.some((f) => f.title.includes("Workers with static assets"))).toBe(true);
    expect(vite.every((f) => !f.title.includes("Cloudflare Pages recommended"))).toBe(true);
    expect(vite.some((f) => f.recommendation.includes("Start new projects with Workers"))).toBe(true);
    expect(vite.some((f) => f.recommendation.includes("Pages is still supported"))).toBe(true);
    const plan = generateMigrationPlanMarkdown(inspection, findings);
    expect(plan).toContain("Workers with static assets");
    expect(plan).toContain("Pages is still supported");
    expect(plan).not.toContain("Deploy `dist/` to Cloudflare Pages");
    const steps = getRemediationForRule("migration-astro", "astro")?.steps.join(" ") ?? "";
    expect(steps).toContain("Workers static assets");
    expect(steps).toContain("Pages is still supported");
    expect(steps).not.toContain("deploy dist/ to Cloudflare Pages");
  });

  it("names React Router (formerly Remix) in the migration plan", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "remix-app"));
    const findings = await runMigrationChecks(inspection, DEFAULT_CONFIG);
    const plan = generateMigrationPlanMarkdown(inspection, findings);
    expect(plan).toContain("React Router (formerly Remix)");
    expect(plan).not.toContain("Use Remix Cloudflare template");
    const steps = getRemediationForRule("migration-remix", "remix")?.steps.join(" ") ?? "";
    expect(steps).toContain("React Router (formerly Remix)");
    expect(getRemediationForRule("migration-remix", "remix")?.docsUrl).toBe(
      "https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/",
    );
  });
});
