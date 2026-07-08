import type { Finding, FindingCategory } from "../config/schema.js";
import {
  CATEGORY_WEIGHTS,
  SEVERITY_DEDUCTIONS,
} from "../config/default-rules.js";

export type CategoryScore = {
  category: FindingCategory;
  score: number;
  weight: number;
  weightedScore: number;
  findingCount: number;
};

export type ReadinessScores = {
  overall: number;
  categories: CategoryScore[];
  migration: number;
  security: number;
  aiReadiness: number;
  seo: number;
  deployment: number;
};

const CATEGORY_ALIASES: Record<string, FindingCategory> = {
  migration: "migration",
  security: "security",
  "ai-readiness": "ai-readiness",
  seo: "seo",
  deployment: "deployment",
  observability: "observability",
};

export function calculateScores(findings: Finding[]): ReadinessScores {
  const categories = Object.keys(CATEGORY_WEIGHTS) as FindingCategory[];
  const categoryScores: CategoryScore[] = [];

  for (const category of categories) {
    const weight = CATEGORY_WEIGHTS[category] ?? 0;
    if (weight === 0) continue;

    const categoryFindings = findings.filter(
      (f) => f.category === category && f.severity !== "passed",
    );

    let score = 100;
    let hasBlocker = false;

    for (const finding of categoryFindings) {
      if (finding.status !== "open") continue;
      const deduction = SEVERITY_DEDUCTIONS[finding.severity] ?? 0;
      if (finding.severity === "blocker") {
        hasBlocker = true;
      }
      score -= deduction;
    }

    if (hasBlocker) score = 0;
    score = Math.max(0, Math.min(100, score));

    categoryScores.push({
      category,
      score,
      weight,
      weightedScore: score * weight,
      findingCount: categoryFindings.length,
    });
  }

  const overall = Math.round(
    categoryScores.reduce((sum, c) => sum + c.weightedScore, 0),
  );

  const getScore = (cat: FindingCategory) =>
    categoryScores.find((c) => c.category === cat)?.score ?? 100;

  return {
    overall,
    categories: categoryScores,
    migration: getScore("migration"),
    security: getScore("security"),
    aiReadiness: getScore("ai-readiness"),
    seo: getScore("seo"),
    deployment: getScore("deployment"),
  };
}

export function isProductionReady(
  findings: Finding[],
  blockOnSecrets: boolean,
  blockOnCriticalDependencies: boolean,
): boolean {
  const openFindings = findings.filter((f) => f.status === "open");

  if (openFindings.some((f) => f.severity === "blocker")) {
    return false;
  }

  if (blockOnSecrets) {
    const criticalSecurity = openFindings.filter(
      (f) =>
        f.category === "security" &&
        (f.severity === "blocker" || f.severity === "high"),
    );
    if (criticalSecurity.length > 0) return false;
  }

  if (blockOnCriticalDependencies) {
    const depBlockers = openFindings.filter(
      (f) => f.id === "security-critical-dependencies",
    );
    if (depBlockers.length > 0) return false;
  }

  return true;
}

export function getCategoryFromAlias(name: string): FindingCategory {
  return CATEGORY_ALIASES[name] ?? "deployment";
}
