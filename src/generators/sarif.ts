import type { Finding } from "../config/schema.js";

const SEVERITY_TO_LEVEL: Record<string, string> = {
  blocker: "error",
  high: "error",
  medium: "warning",
  low: "note",
  info: "note",
  passed: "none",
};

export function generateSarif(findings: Finding[], rootDir: string): string {
  const securityFindings = findings.filter(
    (f) => f.category === "security" && f.severity !== "passed",
  );

  const sarif = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "cf-ready",
            informationUri: "https://ready.orangecloud.vn",
            version: "0.1.0",
            rules: securityFindings.map((f) => ({
              id: f.id,
              name: f.title,
              shortDescription: { text: f.title },
              fullDescription: { text: f.description },
              defaultConfiguration: { level: SEVERITY_TO_LEVEL[f.severity] ?? "warning" },
            })),
          },
        },
        results: securityFindings.map((f) => ({
          ruleId: f.id,
          level: SEVERITY_TO_LEVEL[f.severity] ?? "warning",
          message: { text: f.description },
          locations: (f.affectedFiles ?? []).map((file) => ({
            physicalLocation: {
              artifactLocation: {
                uri: file,
                uriBaseId: rootDir,
              },
            },
          })),
        })),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
