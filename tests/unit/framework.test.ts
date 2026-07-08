import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectRepository } from "../../src/inspectors/repository.js";

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
});
