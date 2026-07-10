import { describe, it, expect } from "vitest";
import { parseScanModules, SCAN_MODULE_NAMES } from "../../src/service/scan-modules.js";

describe("parseScanModules", () => {
  it("returns undefined for empty input", () => {
    expect(parseScanModules()).toBeUndefined();
    expect(parseScanModules("  ")).toBeUndefined();
  });

  it("parses comma-separated module names", () => {
    expect(parseScanModules("migration, security")).toEqual(["migration", "security"]);
  });

  it("throws on unknown modules", () => {
    expect(() => parseScanModules("migration,unknown")).toThrow(/Unknown scan module/);
  });

  it("lists all supported modules", () => {
    expect(SCAN_MODULE_NAMES).toHaveLength(5);
  });
});
