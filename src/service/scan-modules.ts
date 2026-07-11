export const SCAN_MODULE_NAMES = [
  "migration",
  "security",
  "ai-readiness",
  "seo",
  "deployment",
] as const;

export type ScanModuleName = (typeof SCAN_MODULE_NAMES)[number];

export function parseScanModules(input?: string): ScanModuleName[] | undefined {
  if (!input?.trim()) return undefined;
  const allowed = new Set<string>(SCAN_MODULE_NAMES);
  const modules = input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const invalid = modules.filter((name) => !allowed.has(name));
  if (invalid.length > 0) {
    throw new Error(
      `Unknown scan module(s): ${invalid.join(", ")}. Use: ${SCAN_MODULE_NAMES.join(", ")}`,
    );
  }
  return modules as ScanModuleName[];
}
