import type {
  DeploymentTarget,
  Framework,
  PackageManager,
} from "../config/schema.js";

export type PackageJson = {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

export type NextJsDetails = {
  router: "app" | "pages" | "unknown";
  hasMiddleware: boolean;
  hasApiRoutes: boolean;
  configFiles: string[];
};

export type AstroDetails = {
  configFiles: string[];
  hasCloudflareAdapter: boolean;
  outputMode: "static" | "server" | "hybrid" | "unknown";
};

export type RemixDetails = {
  configFiles: string[];
  hasCloudflareAdapter: boolean;
  usesVite: boolean;
};

export type HonoDetails = {
  entryFiles: string[];
  hasNodeServer: boolean;
  hasWorkersAdapterHint: boolean;
};

export type RepositoryInspection = {
  rootDir: string;
  projectName: string;
  framework: Framework;
  frameworkConfidence: "high" | "medium" | "low";
  packageManager: PackageManager;
  deploymentTarget: DeploymentTarget;
  importantFiles: Record<string, boolean>;
  detectedFiles: string[];
  nextJs?: NextJsDetails;
  astro?: AstroDetails;
  remix?: RemixDetails;
  hono?: HonoDetails;
  routes: string[];
  apiRoutes: string[];
  hasAuthPatterns: boolean;
  hasWranglerConfig: boolean;
  publicDir: string;
  sourceFilesScanned: number;
  sourceScanTruncated: boolean;
};
