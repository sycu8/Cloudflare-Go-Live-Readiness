import { describe, it, expect } from "vitest";
import { summarizeEvidence, findLineMatch, redactSecretSnippet } from "../../src/core/evidence.js";
import { dedupeFindings, dedupeCrossModuleAssets } from "../../src/core/findings.js";
import { calculateScores } from "../../src/core/scoring.js";
import { createFinding } from "../../src/core/findings.js";

describe("evidence", () => {
  it("summarizes single and multiple evidence items", () => {
    expect(
      summarizeEvidence([{ file: "src/a.ts", line: 10, snippet: "fs.readFileSync" }]),
    ).toContain("src/a.ts:10");
    expect(
      summarizeEvidence([
        { file: "a.ts", line: 1 },
        { file: "b.ts", line: 2 },
      ]),
    ).toContain("2 location(s)");
  });

  it("finds line matches", () => {
    const match = findLineMatch("const x = 1;\nfs.readFileSync('x');\n", /fs\.readFileSync/);
    expect(match?.line).toBe(2);
  });

  it("redacts secrets in snippets", () => {
    expect(redactSecretSnippet('apiKey = "sk_live_abcdefghijklmnop"')).toContain("REDACTED");
  });
});

describe("dedupeFindings", () => {
  it("merges evidence from duplicate keys", () => {
    const a = createFinding({
      id: "migration-fs",
      category: "migration",
      severity: "blocker",
      title: "Runtime blocker: fs",
      description: "d",
      evidenceItems: [{ file: "a.ts", line: 1 }],
      recommendation: "r",
      autoFixAvailable: false,
      requiresApproval: true,
    });
    const b = { ...a, affectedFiles: ["b.ts"] };
    const out = dedupeFindings([a, b]);
    expect(out).toHaveLength(1);
  });
});

describe("dedupeCrossModuleAssets", () => {
  it("drops ai-readiness robots when seo reports it", () => {
    const seo = createFinding({
      id: "seo-missing-robots-txt",
      category: "seo",
      severity: "low",
      title: "Missing robots.txt",
      description: "d",
      recommendation: "r",
      autoFixAvailable: true,
      requiresApproval: false,
    });
    const ai = createFinding({
      id: "ai-missing-robots",
      category: "ai-readiness",
      severity: "medium",
      title: "Missing robots.txt",
      description: "d",
      recommendation: "r",
      autoFixAvailable: true,
      requiresApproval: false,
    });
    const out = dedupeCrossModuleAssets([seo, ai]);
    expect(out.filter((f) => f.title === "Missing robots.txt")).toHaveLength(1);
    expect(out[0]?.category).toBe("seo");
  });
});

describe("confidence scoring", () => {
  it("applies lower deduction for low confidence", () => {
    const high = calculateScores([
      createFinding({
        category: "seo",
        severity: "medium",
        title: "a",
        description: "d",
        recommendation: "r",
        autoFixAvailable: false,
        requiresApproval: false,
        confidence: "high",
      }),
    ]);
    const low = calculateScores([
      createFinding({
        category: "seo",
        severity: "medium",
        title: "a",
        description: "d",
        recommendation: "r",
        autoFixAvailable: false,
        requiresApproval: false,
        confidence: "low",
      }),
    ]);
    expect(low.seo).toBeGreaterThan(high.seo);
  });
});
