import { describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateProjectRoot } from "../../src/core/validate.js";

describe("validateProjectRoot", () => {
  it("rejects directories without project markers", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "cf-ready-empty-"));
    try {
      await expect(validateProjectRoot(dir)).rejects.toThrow(/No project found/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("accepts directories with index.html", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "cf-ready-static-"));
    try {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(path.join(dir, "index.html"), "<!DOCTYPE html><html></html>");
      await expect(validateProjectRoot(dir)).resolves.toBe(path.resolve(dir));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
