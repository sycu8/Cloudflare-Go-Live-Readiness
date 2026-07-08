import type { Command } from "commander";
import path from "node:path";
import { createScanContext, getOutputDir } from "../../core/context.js";
import { writeTextFile } from "../../core/filesystem.js";
import { generateSeoReadinessReport } from "../../modules/seo/index.js";
import { getGlobalOptions } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";

export function registerSeoReadyCommand(program: Command): void {
  program
    .command("seo-ready")
    .description("Check SEO readiness (metadata, sitemap, structured data)")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      try {
        const context = await createScanContext({
          rootDir: opts.cwd,
          configPath: opts.config,
          modules: ["seo"],
        });

        const content = generateSeoReadinessReport(context.inspection, context.findings);
        const outputPath = path.join(getOutputDir(context), "seo-readiness-report.md");
        await writeTextFile(outputPath, content, { force: true });

        if (opts.json) {
          console.log(
            JSON.stringify({
              score: context.scores.seo,
              findings: context.findings,
              report: outputPath,
            },
            null,
            2,
          ));
        } else {
          logger.heading("SEO Readiness");
          console.log(`Score: ${context.scores.seo}/100`);
          logger.success(`Report: ${outputPath}`);
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
