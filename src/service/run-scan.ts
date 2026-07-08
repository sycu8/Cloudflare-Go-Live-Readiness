import type { ScanContext } from "../core/context.js";
import { createScanContext } from "../core/context.js";
import { writeAllReports } from "../core/report.js";
import { getExitCode } from "../cli/options.js";
import type { ScanResult, ServiceOptions } from "./types.js";

export function serializeScanContext(context: ScanContext, reports?: string[]): ScanResult["data"] {
  return {
    productionReady: context.productionReady,
    scores: context.scores,
    blockers: context.blockers,
    findings: context.findings,
    inspection: context.inspection,
    scannedAt: context.scannedAt,
    reports,
  };
}

export async function runScan(options: ServiceOptions): Promise<ScanResult> {
  const context = await createScanContext(options);
  const reports = await writeAllReports(context);
  const reportNames = reports.map((r) => r.name);

  return {
    context,
    exitCode: getExitCode(context.productionReady, false),
    data: serializeScanContext(context, reportNames),
  };
}
