import type { CfReadyConfig, Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";
import {
  scanSecrets,
  checkEnvFiles,
  checkCors,
  checkSourceMaps,
  checkHeadersConfig,
} from "./secrets.js";
import { checkDependencies } from "./dependencies.js";

export async function runSecurityChecks(
  inspection: RepositoryInspection,
  config: CfReadyConfig,
): Promise<Finding[]> {
  const findings: Finding[] = [];

  findings.push(...(await checkEnvFiles(inspection)));
  findings.push(...(await scanSecrets(inspection)));
  findings.push(...(await checkCors(inspection)));
  findings.push(...(await checkSourceMaps(inspection)));
  findings.push(...(await checkHeadersConfig(inspection)));
  findings.push(...(await checkDependencies(inspection, config)));

  return findings;
}

export type SecurityScanner = {
  name: string;
  run: (inspection: RepositoryInspection) => Promise<Finding[]>;
};

export const FUTURE_SECURITY_SCANNERS: SecurityScanner[] = [
  { name: "Semgrep", run: async () => [] },
  { name: "CodeQL", run: async () => [] },
  { name: "Trivy", run: async () => [] },
  { name: "Gitleaks", run: async () => [] },
];
