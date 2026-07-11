import type { Finding, FindingCategory, FindingSeverity } from "../config/schema.js";

let findingCounter = 0;

export function resetFindingCounter(): void {
  findingCounter = 0;
}

export function createFinding(
  input: Omit<Finding, "id" | "status"> & { id?: string; status?: Finding["status"] },
): Finding {
  findingCounter += 1;
  return {
    id: input.id ?? `${input.category}-${findingCounter}`,
    status: input.status ?? "open",
    ...input,
  };
}

export function createPassedFinding(
  category: FindingCategory,
  title: string,
  description: string,
): Finding {
  return createFinding({
    category,
    severity: "passed",
    title,
    description,
    recommendation: "No action required.",
    autoFixAvailable: false,
    requiresApproval: false,
  });
}

export function sortFindings(findings: Finding[]): Finding[] {
  const severityOrder: FindingSeverity[] = [
    "blocker",
    "high",
    "medium",
    "low",
    "info",
    "passed",
  ];
  return [...findings].sort((a, b) => {
    const sa = severityOrder.indexOf(a.severity);
    const sb = severityOrder.indexOf(b.severity);
    if (sa !== sb) return sa - sb;
    return a.title.localeCompare(b.title);
  });
}

export function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Map<string, Finding>();
  for (const finding of findings) {
    const firstEvidence = finding.evidenceItems?.[0];
    const key =
      finding.id ||
      `${finding.category}:${finding.title}:${firstEvidence?.file ?? ""}:${firstEvidence?.line ?? ""}:${finding.affectedFiles?.join(",") ?? ""}`;
    if (!seen.has(key)) {
      seen.set(key, finding);
      continue;
    }
    const existing = seen.get(key)!;
    const mergedFiles = [
      ...new Set([...(existing.affectedFiles ?? []), ...(finding.affectedFiles ?? [])]),
    ];
    const mergedEvidence = [
      ...(existing.evidenceItems ?? []),
      ...(finding.evidenceItems ?? []),
    ].slice(0, 10);
    seen.set(key, {
      ...existing,
      affectedFiles: mergedFiles.length ? mergedFiles : existing.affectedFiles,
      evidenceItems: mergedEvidence.length ? mergedEvidence : existing.evidenceItems,
      evidence: existing.evidence ?? finding.evidence,
    });
  }
  return [...seen.values()];
}

/** Remove cross-module duplicate asset findings (SEO owns robots/sitemap). */
export function dedupeCrossModuleAssets(findings: Finding[]): Finding[] {
  const seoOwns = new Set(["Missing robots.txt", "Missing sitemap.xml"]);
  const seoTitles = new Set(
    findings.filter((f) => f.category === "seo").map((f) => f.title),
  );
  return findings.filter((f) => {
    if (f.category !== "ai-readiness") return true;
    if (!seoOwns.has(f.title)) return true;
    return !seoTitles.has(f.title);
  });
}

export function applyBaseline(findings: Finding[], config: {
  baseline?: { ignoredFindingIds?: string[]; acceptedRiskIds?: string[] };
}): Finding[] {
  const ignored = new Set(config.baseline?.ignoredFindingIds ?? []);
  const accepted = new Set(config.baseline?.acceptedRiskIds ?? []);
  return findings.map((f) => {
    if (ignored.has(f.id)) return { ...f, status: "ignored" as const };
    if (accepted.has(f.id)) return { ...f, status: "accepted-risk" as const };
    return f;
  });
}

export function filterFindings(
  findings: Finding[],
  category?: FindingCategory,
): Finding[] {
  if (!category) return findings;
  return findings.filter((f) => f.category === category);
}

export function getBlockers(findings: Finding[]): Finding[] {
  return findings.filter((f) => f.severity === "blocker" && f.status === "open");
}

export function getCriticalSecurityFindings(
  findings: Finding[],
  blockOnSecrets: boolean,
): Finding[] {
  if (!blockOnSecrets) return [];
  return findings.filter(
    (f) =>
      f.category === "security" &&
      (f.severity === "blocker" || f.severity === "high") &&
      f.status === "open",
  );
}
