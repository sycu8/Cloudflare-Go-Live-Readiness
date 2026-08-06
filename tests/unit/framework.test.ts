import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectRepository } from "../../src/inspectors/repository.js";
import { runMigrationChecks } from "../../src/modules/migration/index.js";
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
  });

  it("emits specific Remix migration findings", async () => {
    const inspection = await inspectRepository(path.join(fixtures, "remix-app"));
    const findings = await runMigrationChecks(inspection, DEFAULT_CONFIG);
    const migration = findings.filter((f) => f.category === "migration");
    expect(migration.length).toBeGreaterThanOrEqual(2);
    expect(migration.some((f) => f.id === "migration-remix-detected")).toBe(true);
    expect(migration.some((f) => f.id === "migration-remix-adapter-missing")).toBe(true);
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
});
