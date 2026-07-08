import path from "node:path";
import fg from "fast-glob";
import { createFinding, createPassedFinding } from "../../core/findings.js";
import { readTextFile } from "../../core/filesystem.js";
import { SECRET_PATTERNS, SCAN_EXCLUDE_DIRS } from "../../config/default-rules.js";
import { relativeToRoot } from "../../utils/path.js";
import type { Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";

const TEST_FILE_PATTERN = /(\.test\.|\.spec\.|__tests__|fixtures?\/|mock)/i;
const PLACEHOLDER_PATTERN = /(example|placeholder|changeme|your[_-]?key|xxx+|dummy|fake|test)/i;

export async function scanSecrets(inspection: RepositoryInspection): Promise<Finding[]> {
  const findings: Finding[] = [];
  const files = await fg(["**/*.{ts,tsx,js,jsx,json,env,yml,yaml,toml}"], {
    cwd: inspection.rootDir,
    ignore: [
      ...SCAN_EXCLUDE_DIRS.map((d) => `**/${d}/**`),
      "**/package-lock.json",
      "**/pnpm-lock.yaml",
      "**/yarn.lock",
    ],
    dot: true,
    onlyFiles: true,
  });

  for (const file of files.slice(0, 300)) {
    if (TEST_FILE_PATTERN.test(file)) continue;
    const content = await readTextFile(path.join(inspection.rootDir, file));
    if (!content) continue;

    for (const rule of SECRET_PATTERNS) {
      if (rule.pattern.test(content)) {
        const line = content.split("\n").find((l) => rule.pattern.test(l))?.trim();
        if (line && PLACEHOLDER_PATTERN.test(line)) continue;

        findings.push(
          createFinding({
            id: `security-${rule.id}-${file}`,
            category: "security",
            severity: rule.severity,
            title: `Possible ${rule.name} in source`,
            description: `Pattern matching ${rule.name} found in repository.`,
            evidence: line?.slice(0, 120),
            affectedFiles: [relativeToRoot(inspection.rootDir, path.join(inspection.rootDir, file))],
            recommendation: "Rotate the credential immediately. Move secrets to environment variables or Cloudflare secrets store.",
            autoFixAvailable: false,
            requiresApproval: true,
          }),
        );
        break;
      }
    }
  }

  return findings;
}

export async function checkEnvFiles(inspection: RepositoryInspection): Promise<Finding[]> {
  const findings: Finding[] = [];
  const envFiles = [".env", ".env.local", ".env.production", ".env.development"];

  for (const envFile of envFiles) {
    if (inspection.importantFiles[envFile] || inspection.detectedFiles.includes(envFile)) {
      findings.push(
        createFinding({
          category: "security",
          severity: "medium",
          title: `${envFile} present in repository`,
          description: "Environment files may contain secrets.",
          affectedFiles: [envFile],
          recommendation: "Ensure .env files are in .gitignore and never committed. Use Cloudflare dashboard for production secrets.",
          autoFixAvailable: false,
          requiresApproval: false,
        }),
      );
    }
  }

  const gitignore = await readTextFile(path.join(inspection.rootDir, ".gitignore"));
  if (gitignore) {
    const protectsEnv = /\.env/.test(gitignore);
    if (!protectsEnv && envFiles.some((f) => inspection.detectedFiles.includes(f))) {
      findings.push(
        createFinding({
          category: "security",
          severity: "high",
          title: ".env files not protected by .gitignore",
          description: ".gitignore does not appear to exclude .env files.",
          recommendation: "Add `.env*` to .gitignore immediately.",
          autoFixAvailable: false,
          requiresApproval: true,
        }),
      );
    } else if (protectsEnv) {
      findings.push(
        createPassedFinding(
          "security",
          ".env files protected in .gitignore",
          ".gitignore includes .env patterns.",
        ),
      );
    }
  }

  return findings;
}

export async function checkCors(inspection: RepositoryInspection): Promise<Finding[]> {
  const findings: Finding[] = [];
  const files = await fg(["**/*.{ts,js,mjs}"], {
    cwd: inspection.rootDir,
    ignore: SCAN_EXCLUDE_DIRS.map((d) => `**/${d}/**`),
  });

  for (const file of files.slice(0, 100)) {
    const content = await readTextFile(path.join(inspection.rootDir, file));
    if (!content) continue;
    if (
      /Access-Control-Allow-Origin['":\s]+\*/i.test(content) &&
      /credentials.*true/i.test(content)
    ) {
      findings.push(
        createFinding({
          category: "security",
          severity: "high",
          title: "Unsafe CORS: wildcard origin with credentials",
          description: "Allowing * origin with credentials is a security risk.",
          affectedFiles: [file],
          recommendation: "Restrict Access-Control-Allow-Origin to specific trusted domains.",
          autoFixAvailable: false,
          requiresApproval: true,
        }),
      );
    }
  }

  return findings;
}

export async function checkSourceMaps(inspection: RepositoryInspection): Promise<Finding[]> {
  const findings: Finding[] = [];
  const maps = await fg(["public/**/*.map", "dist/**/*.map", "build/**/*.map"], {
    cwd: inspection.rootDir,
    onlyFiles: true,
  });

  if (maps.length > 0) {
    findings.push(
      createFinding({
        category: "security",
        severity: "medium",
        title: "Source maps in public/build output",
        description: `${maps.length} source map file(s) found in deployable directories.`,
        affectedFiles: maps.slice(0, 10),
        recommendation: "Exclude .map files from production deployments or restrict access.",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  return findings;
}

export async function checkHeadersConfig(inspection: RepositoryInspection): Promise<Finding[]> {
  const findings: Finding[] = [];
  const hasHeaders =
    inspection.detectedFiles.some((f) => f.includes("_headers")) ||
    inspection.detectedFiles.includes("vercel.json") ||
    inspection.detectedFiles.some((f) => f.includes("wrangler"));

  if (!hasHeaders) {
    findings.push(
      createFinding({
        category: "security",
        severity: "low",
        title: "No security headers configuration detected",
        description: "No _headers, vercel.json headers, or wrangler security config found.",
        recommendation:
          "Add security headers (CSP, HSTS, X-Frame-Options) via Cloudflare Transform Rules or _headers file.",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  return findings;
}
