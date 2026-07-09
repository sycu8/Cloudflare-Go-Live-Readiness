import path from "node:path";
import { createScanContext, getOutputDir } from "../core/context.js";
import { writeAllReports } from "../core/report.js";
import { writeTextFile } from "../core/filesystem.js";
import { generateSarif } from "../generators/sarif.js";
import { generateMigrationPlanMarkdown } from "../modules/migration/index.js";
import { generateAiReadinessReport } from "../modules/ai-readiness/index.js";
import { generateSeoReadinessReport } from "../modules/seo/index.js";
import { generateMarkdownReport } from "../generators/markdown-report.js";
import {
  buildOptimizePayload,
  callAiOptimizeApi,
  getAiModel,
  getAiWorkerUrl,
} from "../modules/ai-optimize/index.js";
import { loadConfig, inspectRepository } from "../inspectors/repository.js";
import { validateProjectRoot } from "../core/validate.js";
import { runSmokeTest } from "../modules/smoke-test/index.js";
import { generateAiAssets } from "../generators/ai-assets.js";
import { generateSeoAssets } from "../generators/seo-assets.js";
import { getExitCode } from "../cli/options.js";
import { runScan, serializeScanContext } from "./run-scan.js";
import type { CommandName, CommandOptions, CommandResult } from "./types.js";

function inspectionPayload(context: Awaited<ReturnType<typeof createScanContext>>) {
  const { inspection } = context;
  return {
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
  };
}

export async function runCommand(
  command: CommandName,
  options: CommandOptions,
): Promise<CommandResult> {
  const skipReports = Boolean(options.skipReports);

  switch (command) {
    case "scan": {
      const result = await runScan(options);
      return { exitCode: result.exitCode, data: result.data };
    }

    case "inspect": {
      const context = await createScanContext({ ...options, modules: [] });
      return { exitCode: 0, data: inspectionPayload(context) };
    }

    case "migration-plan": {
      const context = await createScanContext({ ...options, modules: ["migration"] });
      const content = generateMigrationPlanMarkdown(context.inspection, context.findings);
      const outputPath = path.join(getOutputDir(context), "migration-plan.md");
      if (!skipReports) {
        await writeTextFile(outputPath, content, { force: true });
      }
      return {
        exitCode: 0,
        data: skipReports
          ? { findings: context.findings.length, markdown: content }
          : { path: outputPath, findings: context.findings.length },
        markdown: content,
      };
    }

    case "security-scan": {
      const context = await createScanContext({ ...options, modules: ["security"] });
      const sarif = generateSarif(context.findings, context.rootDir);
      const outputPath = path.join(getOutputDir(context), "security-findings.sarif");
      if (!skipReports) {
        await writeTextFile(outputPath, sarif, { force: true });
      }
      const securityFindings = context.findings.filter((f) => f.category === "security");
      return {
        exitCode: getExitCode(context.productionReady, false),
        data: {
          findings: securityFindings,
          sarif: skipReports ? undefined : outputPath,
          score: context.scores.security,
        },
      };
    }

    case "ai-ready": {
      const context = await createScanContext({ ...options, modules: ["ai-readiness"] });
      const content = generateAiReadinessReport(context.inspection, context.findings);
      const outputPath = path.join(getOutputDir(context), "ai-readiness-report.md");
      if (!skipReports) {
        await writeTextFile(outputPath, content, { force: true });
      }
      return {
        exitCode: 0,
        data: {
          score: context.scores.aiReadiness,
          findings: context.findings,
          report: skipReports ? undefined : outputPath,
        },
        markdown: content,
      };
    }

    case "seo-ready": {
      const context = await createScanContext({ ...options, modules: ["seo"] });
      const content = generateSeoReadinessReport(context.inspection, context.findings);
      const outputPath = path.join(getOutputDir(context), "seo-readiness-report.md");
      if (!skipReports) {
        await writeTextFile(outputPath, content, { force: true });
      }
      return {
        exitCode: 0,
        data: {
          score: context.scores.seo,
          findings: context.findings,
          report: skipReports ? undefined : outputPath,
        },
        markdown: content,
      };
    }

    case "deploy-check": {
      const context = await createScanContext({
        ...options,
        modules: ["deployment", "migration", "security"],
      });
      const deploymentFindings = context.findings.filter(
        (f) => f.category === "deployment" || f.severity === "blocker",
      );
      return {
        exitCode: getExitCode(context.productionReady, false),
        data: {
          ...serializeScanContext(context),
          deploymentScore: context.scores.deployment,
          deploymentFindings,
        },
      };
    }

    case "report": {
      const context = await createScanContext(options);
      const reports = await writeAllReports(context);
      return {
        exitCode: 0,
        data: { reports: reports.map((r) => r.name) },
      };
    }

    case "ai-optimize": {
      const focus = options.focus ?? "all";
      const context = await createScanContext(options);

      if (options.model) {
        context.config.ai = {
          ...context.config.ai,
          model: options.model,
          gatewayId: context.config.ai?.gatewayId ?? "default",
        };
      }

      const payload = await buildOptimizePayload(context, focus);
      const workerUrl = options.workerUrl ?? getAiWorkerUrl(context.config);

      if (options.dryRun) {
        return { exitCode: 0, data: { workerUrl, payload } };
      }

      const result = await callAiOptimizeApi(
        workerUrl,
        payload,
        options.aiToken ?? context.config.ai?.apiToken ?? process.env.CF_READY_AI_TOKEN,
      );

      const markdown = String(result.markdown ?? "");
      const outputPath = path.join(getOutputDir(context), "cf-ready-ai-optimize.md");
      if (!skipReports) {
        await writeTextFile(outputPath, markdown, { force: true });
      }

      return {
        exitCode: 0,
        data: {
          ...result,
          reportPath: skipReports ? undefined : outputPath,
          model: getAiModel(context.config),
        },
        markdown,
      };
    }

    case "smoke-test": {
      if (!options.url) {
        throw new Error("--url is required for smoke-test");
      }
      const rootDir = await validateProjectRoot(options.rootDir);
      const config = await loadConfig(rootDir, options.configPath);
      const inspection = await inspectRepository(rootDir);
      const report = await runSmokeTest(options.url, config, inspection);
      const hasBlocker = report.findings.some((f) => f.severity === "blocker");
      return {
        exitCode: getExitCode(!hasBlocker, false),
        data: report,
      };
    }

    case "fix": {
      if (!options.aiReadiness && !options.seo) {
        throw new Error("Specify aiReadiness and/or seo for fix command");
      }
      const context = await createScanContext({ ...options, modules: [] });
      const results: Array<{ file: string; status: string }> = [];

      if (options.aiReadiness) {
        results.push(...(await generateAiAssets(context, { force: options.force })));
      }
      if (options.seo) {
        results.push(...(await generateSeoAssets(context, { force: options.force })));
      }

      return { exitCode: 0, data: { results } };
    }

    default:
      throw new Error(`Unknown command: ${command satisfies never}`);
  }
}

export async function runScanMarkdown(options: CommandOptions): Promise<string> {
  const context = await createScanContext(options);
  return generateMarkdownReport(context);
}

export { serializeScanContext };
