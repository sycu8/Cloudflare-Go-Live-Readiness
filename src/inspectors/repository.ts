import path from "node:path";
import { readFile } from "node:fs/promises";
import { ZodError } from "zod";
import {
  CfReadyConfigSchema,
  DEFAULT_CONFIG,
  type CfReadyConfig,
} from "../config/schema.js";
import { fileExists } from "../core/filesystem.js";
import { detectPackageManager, findDetectedFiles, buildImportantFilesMap } from "../inspectors/package-manager.js";
import {
  detectFramework,
  detectApiRoutes,
  detectPageRoutes,
  detectAuthPatterns,
} from "../inspectors/framework.js";
import { detectDeploymentTarget } from "../inspectors/deployment.js";
import { inspectCloudflare } from "../inspectors/cloudflare.js";
import { readPackageJson, getProjectName } from "../utils/package-json.js";
import type { RepositoryInspection } from "../inspectors/types.js";
import { projectGlob } from "../utils/glob.js";

export async function loadConfig(
  rootDir: string,
  configPath?: string,
): Promise<CfReadyConfig> {
  const explicit = Boolean(configPath);
  const resolved = configPath
    ? path.resolve(configPath)
    : path.join(rootDir, "cf-ready.config.json");

  if (!(await fileExists(resolved))) {
    if (explicit) {
      throw new Error(`Config file not found: ${resolved}`);
    }
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = JSON.parse(await readFile(resolved, "utf8")) as unknown;
    return CfReadyConfigSchema.parse(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues
        .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .join("; ");
      throw new Error(`Invalid cf-ready.config.json: ${details}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid cf-ready.config.json: ${error.message}`);
    }
    throw new Error(
      `Invalid cf-ready.config.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function inspectRepository(rootDir: string): Promise<RepositoryInspection> {
  const pkg = await readPackageJson(rootDir);
  const detectedFiles = await findDetectedFiles(rootDir);
  const importantFiles = await buildImportantFilesMap(rootDir, detectedFiles);
  const packageManager = await detectPackageManager(rootDir);
  const { framework, confidence, nextJs } = await detectFramework(rootDir, pkg);
  const deploymentTarget = await detectDeploymentTarget(rootDir, pkg);
  const cloudflare = await inspectCloudflare(rootDir);
  const apiRoutes = await detectApiRoutes(rootDir, framework);
  const routes = await detectPageRoutes(rootDir, framework);
  const hasAuthPatterns = await detectAuthPatterns(rootDir);

  const publicDir = (await fileExists(path.join(rootDir, "public")))
    ? path.join(rootDir, "public")
    : rootDir;

  const sourceFiles = await projectGlob(["**/*.{ts,tsx,js,jsx,mjs,cjs}"], {
    cwd: rootDir,
    onlyFiles: true,
  });

  const sourceScanTruncated = sourceFiles.length > 500;

  return {
    rootDir,
    projectName: getProjectName(pkg, path.basename(rootDir)),
    framework: framework,
    frameworkConfidence: confidence,
    packageManager,
    deploymentTarget,
    importantFiles,
    detectedFiles,
    nextJs,
    routes: [...new Set([...routes, ...apiRoutes])].sort(),
    apiRoutes,
    hasAuthPatterns,
    hasWranglerConfig: cloudflare.hasWranglerConfig,
    publicDir,
    sourceFilesScanned: Math.min(sourceFiles.length, 500),
    sourceScanTruncated,
  };
}
