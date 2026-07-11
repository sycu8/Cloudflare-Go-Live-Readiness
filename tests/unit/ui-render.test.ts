import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  escapeHtml,
  renderResults,
  renderEmptyResults,
  scoreTone,
} from "../../web/src/ui/render.js";

const seedDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../qa/seed");

describe("ui render", () => {
  it("escapeHtml neutralizes HTML", () => {
    expect(escapeHtml('<script>alert("x")</script>')).not.toContain("<script>");
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("scoreTone buckets values", () => {
    expect(scoreTone(85)).toBe("good");
    expect(scoreTone(65)).toBe("warn");
    expect(scoreTone(40)).toBe("bad");
  });

  it("renderEmptyResults includes guidance", () => {
    const html = renderEmptyResults();
    expect(html).toContain("Chưa có kết quả scan");
    expect(html).toContain("scan");
  });

  it("renderResults handles large sanitized scan seed", () => {
    const data = JSON.parse(
      readFileSync(path.join(seedDir, "scan-result-large.json"), "utf8"),
    ) as {
      productionReady: boolean;
      scores: Record<string, number>;
      findings: Array<{ severity: string; title: string; category: string }>;
      inspection: { projectName: string; framework: string; deploymentTarget: string };
    };

    const html = renderResults(
      {
        productionReady: data.productionReady,
        scores: data.scores as never,
        blockers: data.findings.filter((f) => f.severity === "blocker") as never,
        findings: data.findings as never,
        inspection: data.inspection,
      },
      "all",
      "00000000-0000-0000-0000-000000000099",
    );

    expect(html).toContain("QA Scale Fixture");
    expect(html).toContain("Download PDF");
    expect(html).not.toMatch(/<script/i);
    expect((html.match(/<article class="finding-card/g) ?? []).length).toBeLessThanOrEqual(50);
  });

  it("filter blockers reduces finding cards", () => {
    const html = renderResults(
      {
        productionReady: false,
        scores: {
          overall: 50,
          migration: 0,
          security: 80,
          aiReadiness: 50,
          seo: 50,
          deployment: 80,
        },
        blockers: [{ id: "b1", title: "Blocker A", severity: "blocker", category: "migration" }],
        findings: [
          { id: "b1", title: "Blocker A", severity: "blocker", category: "migration" },
          { id: "h1", title: "High B", severity: "high", category: "security" },
        ],
      },
      "blockers",
    );
    expect(html).toContain("Blocker A");
    expect(html).not.toContain("High B");
  });
});
