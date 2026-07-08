import type { ScanContext } from "../core/context.js";
import pc from "picocolors";

export function printScanSummary(context: ScanContext): void {
  const { inspection, scores, blockers, productionReady } = context;

  console.log("");
  console.log(pc.bold("Cloudflare Go-Live Readiness Report"));
  console.log("");
  console.log(`Project: ${context.config.projectName ?? inspection.projectName}`);
  console.log(`Framework: ${inspection.framework}`);
  if (inspection.nextJs) {
    console.log(`Router: ${inspection.nextJs.router === "app" ? "App Router" : "Pages Router"}`);
  }
  console.log(`Current target: ${inspection.deploymentTarget}`);
  console.log(`Overall readiness: ${scores.overall}/100`);
  console.log("");
  console.log(`Migration: ${scores.migration}/100`);
  console.log(`Security: ${scores.security}/100`);
  console.log(`AI readiness: ${scores.aiReadiness}/100`);
  console.log(`SEO: ${scores.seo}/100`);
  console.log(`Deployment: ${scores.deployment}/100`);
  console.log("");

  if (!productionReady) {
    console.log(pc.red("Not production ready"));
  } else {
    console.log(pc.green("Production ready"));
  }

  if (blockers.length > 0) {
    console.log("");
    console.log(pc.red("Blockers:"));
    for (const b of blockers) {
      console.log(`- ${b.title}`);
    }
  }

  const autoFixes = context.findings.filter((f) => f.autoFixAvailable && f.status === "open");
  if (autoFixes.length > 0) {
    console.log("");
    console.log("Auto-fixes available:");
    for (const f of autoFixes.slice(0, 5)) {
      console.log(`- ${f.title}`);
    }
  }
}

export function printInspection(context: ScanContext): void {
  const { inspection } = context;
  console.log(JSON.stringify(
    {
      projectName: inspection.projectName,
      framework: inspection.framework,
      frameworkConfidence: inspection.frameworkConfidence,
      packageManager: inspection.packageManager,
      deploymentTarget: inspection.deploymentTarget,
      importantFiles: inspection.importantFiles,
      routes: inspection.routes,
      apiRoutes: inspection.apiRoutes,
      hasWranglerConfig: inspection.hasWranglerConfig,
      nextJs: inspection.nextJs,
      detectedFiles: inspection.detectedFiles,
    },
    null,
    2,
  ));
}
