import { describe, it, expect } from "vitest";
import { calculateScores, isProductionReady } from "../../src/core/scoring.js";
import { createFinding } from "../../src/core/findings.js";

describe("scoring", () => {
  it("calculates weighted overall score", () => {
    const findings = [
      createFinding({
        category: "migration",
        severity: "passed",
        title: "ok",
        description: "ok",
        recommendation: "none",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    ];
    const scores = calculateScores(findings);
    expect(scores.overall).toBeGreaterThan(0);
  });

  it("blocks production on blocker findings", () => {
    const findings = [
      createFinding({
        category: "migration",
        severity: "blocker",
        title: "blocker",
        description: "blocker",
        recommendation: "fix",
        autoFixAvailable: false,
        requiresApproval: true,
      }),
    ];
    expect(isProductionReady(findings, true, true)).toBe(false);
  });
});
