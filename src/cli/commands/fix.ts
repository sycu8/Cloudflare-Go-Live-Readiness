import type { Command } from "commander";
import { runCommand } from "../../service/run-command.js";
import { getGlobalOptions, serviceOptionsFromGlobal } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";

export function registerFixCommand(program: Command): void {
  program
    .command("fix")
    .description("Generate safe readiness assets (only with explicit flags)")
    .option("--ai-readiness", "Generate AI readiness files (robots.txt, llms.txt, etc.)")
    .option("--seo", "Generate SEO assets and suggestions")
    .option("--force", "Overwrite existing generated files")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      const fixOpts = this.opts();
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      if (!fixOpts.aiReadiness && !fixOpts.seo) {
        logger.error("Specify --ai-readiness and/or --seo. No files modified.");
        process.exit(2);
      }

      try {
        const result = await runCommand("fix", {
          ...serviceOptionsFromGlobal(opts),
          aiReadiness: fixOpts.aiReadiness,
          seo: fixOpts.seo,
          force: fixOpts.force,
        });

        const data = result.data as { results: Array<{ file: string; status: string }> };

        if (opts.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          for (const r of data.results) {
            const label = r.status === "skipped" ? "skipped (exists)" : r.status;
            logger.success(`${r.file}: ${label}`);
          }
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
