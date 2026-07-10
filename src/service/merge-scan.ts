import type { Finding } from "../config/schema.js";
import { dedupeFindings } from "../core/findings.js";
import { calculateScores, isProductionReady } from "../core/scoring.js";
import type { ScanResult } from "./types.js";

export type PartialScanPayload = ScanResult["data"];

function isPartialScanPayload(value: unknown): value is PartialScanPayload {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.findings) && typeof record.inspection === "object";
}

/** Merge module-level scan JSON into a single full-scan payload. */
export function mergePartialScanResults(partials: unknown[]): PartialScanPayload {
  const valid = partials.filter(isPartialScanPayload);
  if (valid.length === 0) {
    throw new Error("No valid scan module results to merge");
  }

  const inspection =
    valid.find((part) => part.inspection?.framework)?.inspection ?? valid[0].inspection;

  const allFindings: Finding[] = [];
  for (const part of valid) {
    allFindings.push(...part.findings);
  }

  const findings = dedupeFindings(allFindings);
  const scores = calculateScores(findings);
  const blockers = findings.filter((f) => f.severity === "blocker" && f.status === "open");
  const productionReady = isProductionReady(findings, true, true);
  const scannedAt = valid
    .map((part) => part.scannedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? new Date().toISOString();

  return {
    productionReady,
    scores,
    blockers,
    findings,
    inspection,
    scannedAt,
  };
}
