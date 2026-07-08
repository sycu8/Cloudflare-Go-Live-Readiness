import type { Command } from "commander";
import { runCommand } from "../../service/run-command.js";
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
        const result = await runCommand("seo-ready", {
          rootDir: opts.cwd,
          configPath: opts.config,
        });

        const data = result.data as { score: number; report: string };

        if (opts.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          logger.heading("SEO Readiness");
          console.log(`Score: ${data.score}/100`);
          logger.success(`Report: ${data.report}`);
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
