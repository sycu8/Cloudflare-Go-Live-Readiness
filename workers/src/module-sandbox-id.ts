import type { ScanModuleName } from "../../src/service/scan-modules.js";

const MAX_SANDBOX_ID_LEN = 63;

const MODULE_SUFFIX: Record<ScanModuleName, string> = {
  migration: "mg",
  security: "sc",
  "ai-readiness": "ai",
  seo: "se",
  deployment: "dp",
};

/** Derive a per-module sandbox ID (one container per scan module). */
export function buildModuleSandboxId(sessionId: string, module: ScanModuleName): string {
  const suffix = MODULE_SUFFIX[module];
  const maxBase = MAX_SANDBOX_ID_LEN - 1 - suffix.length;
  const base = sessionId.trim().slice(0, Math.max(1, maxBase));
  return `${base}-${suffix}`;
}
