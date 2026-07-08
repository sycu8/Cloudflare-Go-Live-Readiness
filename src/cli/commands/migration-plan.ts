import type { Command } from "commander";
import path from "node:path";
import { createScanContext, getOutputDir } from "../../core/context.js";
import { writeTextFile } from "../../core/filesystem.js";
import { generateMigrationPlanMarkdown } from "../../modules/migration/index.js";
import { getGlobalOptions } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";

export function registerMigrationPlanCommand(program: Command): void {
  program
    .command("migration-plan")
    .description("Generate Cloudflare migration plan")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      try {
        const context = await createScanContext({
          rootDir: opts.cwd,
          configPath: opts.config,
          modules: ["migration"],
        });

        const content = generateMigrationPlanMarkdown(context.inspection, context.findings);
        const outputPath = path.join(getOutputDir(context), "migration-plan.md");
        await writeTextFile(outputPath, content, { force: true });

        if (opts.json) {
          console.log(JSON.stringify({ path: outputPath, findings: context.findings.length }, null, 2));
        } else {
          logger.success(`migration-plan.md written to ${outputPath}`);
          console.log("\n" + content);
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
