import { describe, it, expect } from "vitest";
import { projectScanIgnore } from "../../src/utils/glob.js";
import { WINDOWS_PROFILE_JUNCTIONS } from "../../src/config/default-rules.js";

describe("projectGlob", () => {
  it("ignores Windows profile junction directories", () => {
    const ignore = projectScanIgnore();
    for (const dir of WINDOWS_PROFILE_JUNCTIONS) {
      expect(ignore).toContain(`**/${dir}/**`);
    }
  });
});
