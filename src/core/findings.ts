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
    const key = `${finding.category}:${finding.title}:${finding.affectedFiles?.join(",") ?? ""}`;
    if (!seen.has(key)) {
      seen.set(key, finding);
    }
  }
  return [...seen.values()];
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
