import { describe, it, expect } from "vitest";
import { buildModuleSandboxId } from "../../workers/src/module-sandbox-id.js";
import { SCAN_MODULE_NAMES } from "../../src/service/scan-modules.js";

describe("buildModuleSandboxId", () => {
  it("creates unique sandbox IDs per module within 63 chars", () => {
    const sessionId = "a".repeat(63);
    const ids = new Set(SCAN_MODULE_NAMES.map((module) => buildModuleSandboxId(sessionId, module)));
    expect(ids.size).toBe(SCAN_MODULE_NAMES.length);
    for (const id of ids) {
      expect(id.length).toBeLessThanOrEqual(63);
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it("uses stable suffixes for each module", () => {
    expect(buildModuleSandboxId("sess", "migration")).toBe("sess-mg");
    expect(buildModuleSandboxId("sess", "security")).toBe("sess-sc");
    expect(buildModuleSandboxId("sess", "ai-readiness")).toBe("sess-ai");
    expect(buildModuleSandboxId("sess", "seo")).toBe("sess-se");
    expect(buildModuleSandboxId("sess", "deployment")).toBe("sess-dp");
  });
});
