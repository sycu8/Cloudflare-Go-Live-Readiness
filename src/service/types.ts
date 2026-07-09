import type { ScanContext, ScanOptions } from "../core/context.js";
import type { Finding } from "../config/schema.js";
import type { ReadinessScores } from "../core/scoring.js";
import type { RepositoryInspection } from "../inspectors/types.js";

export type ServiceOptions = ScanOptions & {
  json?: boolean;
  /** Skip writing report artifacts to disk (web agent / JSON-only runs). */
  skipReports?: boolean;
};

export type ScanResult = {
  context: ScanContext;
  exitCode: number;
  data: {
    productionReady: boolean;
    scores: ReadinessScores;
    blockers: Finding[];
    findings: Finding[];
    inspection: RepositoryInspection;
    scannedAt: string;
    reports?: string[];
  };
};

export type CommandName =
  | "scan"
  | "inspect"
  | "migration-plan"
  | "security-scan"
  | "ai-ready"
  | "seo-ready"
  | "deploy-check"
  | "report"
  | "ai-optimize"
  | "smoke-test"
  | "fix";

export type CommandOptions = ServiceOptions & {
  focus?: "migration" | "security" | "all";
  workerUrl?: string;
  model?: string;
  aiToken?: string;
  dryRun?: boolean;
  url?: string;
  aiReadiness?: boolean;
  seo?: boolean;
  force?: boolean;
};

export type CommandResult = {
  exitCode: number;
  data: unknown;
  markdown?: string;
  stdout?: string;
};
