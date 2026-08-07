import path from "node:path";
import { createFinding, createPassedFinding } from "../../core/findings.js";
import { fileExists, readTextFile } from "../../core/filesystem.js";
import type { Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";

export type WranglerValidation = {
  file: string | null;
  name?: string;
  compatibilityDate?: string;
  main?: string;
  hasPagesOrAssets: boolean;
  raw: string;
};

const CF_DOCS = "https://developers.cloudflare.com/workers/wrangler/configuration/";

function stripJsonc(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function parseTomlString(raw: string, key: string): string | undefined {
  const re = new RegExp(`^\\s*${key}\\s*=\\s*["']([^"']+)["']`, "m");
  return raw.match(re)?.[1];
}

function parseJsoncField(raw: string, key: string): string | undefined {
  try {
    const data = JSON.parse(stripJsonc(raw)) as Record<string, unknown>;
    const value = data[key];
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

function hasPagesOrAssets(raw: string, isJson: boolean): boolean {
  if (isJson) {
    try {
      const data = JSON.parse(stripJsonc(raw)) as Record<string, unknown>;
      return Boolean(data.pages_build_output_dir || data.assets || data.site);
    } catch {
      return /pages_build_output_dir|"assets"\s*:/.test(raw);
    }
  }
  return /\[(?:site|assets)\]|pages_build_output_dir\s*=/.test(raw);
}

export async function loadWranglerConfig(
  rootDir: string,
): Promise<WranglerValidation> {
  const candidates = ["wrangler.toml", "wrangler.jsonc", "wrangler.json"];
  for (const file of candidates) {
    const full = path.join(rootDir, file);
    if (!(await fileExists(full))) continue;
    const raw = (await readTextFile(full)) ?? "";
    const isJson = file.endsWith(".json") || file.endsWith(".jsonc");
    return {
      file,
      name: isJson ? parseJsoncField(raw, "name") : parseTomlString(raw, "name"),
      compatibilityDate: isJson
        ? parseJsoncField(raw, "compatibility_date")
        : parseTomlString(raw, "compatibility_date"),
      main: isJson ? parseJsoncField(raw, "main") : parseTomlString(raw, "main"),
      hasPagesOrAssets: hasPagesOrAssets(raw, isJson),
      raw,
    };
  }
  return { file: null, hasPagesOrAssets: false, raw: "" };
}

function isStaleCompatibilityDate(date: string): boolean {
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return true;
  const ageMs = Date.now() - parsed;
  const twoYears = 730 * 24 * 60 * 60 * 1000;
  return ageMs > twoYears;
}

/** Phase 5 — deep Wrangler config validation (no Cloudflare API required). */
export async function validateWranglerConfig(
  inspection: RepositoryInspection,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const config = await loadWranglerConfig(inspection.rootDir);

  if (!config.file) {
    if (
      inspection.deploymentTarget === "cloudflare-workers" ||
      inspection.deploymentTarget === "cloudflare-pages" ||
      inspection.framework === "hono" ||
      inspection.framework === "astro" ||
      inspection.framework === "remix"
    ) {
      findings.push(
        createFinding({
          id: "deploy-wrangler-missing",
          category: "deployment",
          severity: "high",
          title: "Wrangler config missing",
          description: "No wrangler.toml / wrangler.jsonc found for a Cloudflare-oriented project.",
          recommendation:
            "Add wrangler.toml with name, compatibility_date, and main (Workers) or pages/assets (Pages).",
          remediation: {
            steps: [
              "Create wrangler.toml at the project root.",
              'Set name = "your-app" and compatibility_date to today\'s date (YYYY-MM-DD).',
              "For Workers set main = \"src/index.ts\"; for Pages set pages_build_output_dir or assets.",
            ],
            docsUrl: CF_DOCS,
            wranglerSnippet:
              'name = "my-app"\nmain = "src/index.ts"\ncompatibility_date = "2024-09-23"',
            estimatedEffort: "minutes",
          },
          autoFixAvailable: false,
          requiresApproval: false,
        }),
      );
    }
    return findings;
  }

  findings.push(
    createPassedFinding(
      "deployment",
      `Wrangler config found (${config.file})`,
      `${config.file} is present for Cloudflare deployment.`,
    ),
  );

  if (!config.name) {
    findings.push(
      createFinding({
        id: "deploy-wrangler-name",
        category: "deployment",
        severity: "medium",
        title: "Wrangler name missing",
        description: `${config.file} does not define a Worker/Pages name.`,
        recommendation: `Add name = "your-app" to ${config.file}.`,
        remediation: {
          steps: [`Add a unique name field to ${config.file}.`],
          docsUrl: CF_DOCS,
          wranglerSnippet: 'name = "my-app"',
          estimatedEffort: "minutes",
        },
        autoFixAvailable: false,
        requiresApproval: false,
        evidenceItems: [{ file: config.file }],
      }),
    );
  }

  if (!config.compatibilityDate) {
    findings.push(
      createFinding({
        id: "deploy-wrangler-compat-date",
        category: "deployment",
        severity: "high",
        title: "compatibility_date missing",
        description: `${config.file} has no compatibility_date — Workers require it.`,
        recommendation: "Set compatibility_date to a recent YYYY-MM-DD value.",
        remediation: {
          steps: [
            "Add compatibility_date = \"YYYY-MM-DD\" (use today's date or a known-good Workers date).",
            "Re-run wrangler deploy --dry-run to verify.",
          ],
          docsUrl: CF_DOCS,
          wranglerSnippet: 'compatibility_date = "2024-09-23"',
          estimatedEffort: "minutes",
        },
        autoFixAvailable: false,
        requiresApproval: false,
        evidenceItems: [{ file: config.file }],
      }),
    );
  } else if (isStaleCompatibilityDate(config.compatibilityDate)) {
    findings.push(
      createFinding({
        id: "deploy-wrangler-compat-stale",
        category: "deployment",
        severity: "low",
        title: "compatibility_date looks stale",
        description: `compatibility_date is ${config.compatibilityDate} (>2 years old).`,
        recommendation: "Bump compatibility_date after checking Workers changelog for breaking changes.",
        remediation: {
          steps: [
            "Review Workers compatibility calendar.",
            "Update compatibility_date and run tests / wrangler deploy --dry-run.",
          ],
          docsUrl: "https://developers.cloudflare.com/workers/configuration/compatibility-dates/",
          estimatedEffort: "minutes",
        },
        autoFixAvailable: false,
        requiresApproval: false,
        evidenceItems: [{ file: config.file, snippet: config.compatibilityDate }],
      }),
    );
  } else {
    findings.push(
      createPassedFinding(
        "deployment",
        "compatibility_date set",
        `compatibility_date = ${config.compatibilityDate}`,
      ),
    );
  }

  const hasEntry = Boolean(config.main) || config.hasPagesOrAssets;
  if (!hasEntry) {
    findings.push(
      createFinding({
        id: "deploy-wrangler-entry",
        category: "deployment",
        severity: "high",
        title: "No Worker entry or Pages assets configured",
        description: `${config.file} has neither main nor pages/assets configuration.`,
        recommendation:
          "Set main for Workers, or pages_build_output_dir / [assets] for Pages / Workers Assets.",
        remediation: {
          steps: [
            "Workers: set main = \"src/index.ts\" (or your entry).",
            "Pages / Assets: set pages_build_output_dir or configure [assets].",
          ],
          docsUrl: CF_DOCS,
          wranglerSnippet: 'main = "src/index.ts"',
          estimatedEffort: "minutes",
        },
        autoFixAvailable: false,
        requiresApproval: false,
        evidenceItems: [{ file: config.file }],
      }),
    );
  } else {
    findings.push(
      createPassedFinding(
        "deployment",
        "Deploy entry configured",
        config.main
          ? `main = ${config.main}`
          : "Pages/assets configuration detected.",
      ),
    );
  }

  return findings;
}

export function generatePostDeployChecklist(
  inspection: RepositoryInspection,
  productionUrl?: string,
): string {
  const url = productionUrl ?? "<production-url>";
  return [
    "# Post-deploy checklist",
    "",
    `**Project:** ${inspection.projectName}`,
    `**Framework:** ${inspection.framework}`,
    "",
    "## Before go-live",
    "",
    "- [ ] `wrangler deploy --dry-run` succeeds",
    "- [ ] Secrets set via `wrangler secret put` / dashboard (never commit)",
    "- [ ] compatibility_date reviewed",
    "- [ ] Critical routes listed in cf-ready.config.json",
    "",
    "## After deploy",
    "",
    `- [ ] \`cf-ready smoke-test --url ${url}\``,
    "- [ ] Check Cloudflare analytics / error rates",
    "- [ ] Confirm DNS / custom domain",
    "- [ ] Keep rollback plan ready (`wrangler rollback` or prior Pages deployment)",
    "",
    "## AI agent prompt (optional)",
    "",
    "````",
    "Review this project's wrangler config and make it production-ready for Cloudflare.",
    "Ensure name, compatibility_date, and main/pages assets are set.",
    "Do not deploy. Propose secrets as wrangler secret put commands only.",
    "````",
    "",
  ].join("\n");
}
