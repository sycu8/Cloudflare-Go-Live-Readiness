import type { Command } from "commander";
import { runCommand } from "../../service/run-command.js";
import { getGlobalOptions, serviceOptionsFromGlobal } from "../options.js";
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
        const result = await runCommand("migration-plan", serviceOptionsFromGlobal(opts));

        if (opts.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          const data = result.data as { path: string };
          logger.success(`migration-plan.md written to ${data.path}`);
          if (result.markdown) console.log("\n" + result.markdown);
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
