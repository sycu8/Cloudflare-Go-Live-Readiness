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
  routes: string[];
  apiRoutes: string[];
  hasAuthPatterns: boolean;
  hasWranglerConfig: boolean;
  publicDir: string;
  sourceFilesScanned: number;
  sourceScanTruncated: boolean;
};
