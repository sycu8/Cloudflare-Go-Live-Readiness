import type { Command } from "commander";
import path from "node:path";
import { createScanContext, getOutputDir } from "../../core/context.js";
import { writeTextFile } from "../../core/filesystem.js";
import { generateAiReadinessReport } from "../../modules/ai-readiness/index.js";
import { getGlobalOptions } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";

export function registerAiReadyCommand(program: Command): void {
  program
    .command("ai-ready")
    .description("Check AI readiness (robots.txt, llms.txt, OpenAPI, MCP)")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      try {
        const context = await createScanContext({
          rootDir: opts.cwd,
          configPath: opts.config,
          modules: ["ai-readiness"],
        });

        const content = generateAiReadinessReport(context.inspection, context.findings);
        const outputPath = path.join(getOutputDir(context), "ai-readiness-report.md");
        await writeTextFile(outputPath, content, { force: true });

        if (opts.json) {
          console.log(
            JSON.stringify({
              score: context.scores.aiReadiness,
              findings: context.findings,
              report: outputPath,
            },
            null,
            2,
          ));
        } else {
          logger.heading("AI Readiness");
          console.log(`Score: ${context.scores.aiReadiness}/100`);
          logger.success(`Report: ${outputPath}`);
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
