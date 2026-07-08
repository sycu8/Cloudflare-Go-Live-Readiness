import type { Command } from "commander";
import { runCommand } from "../../service/run-command.js";
import { getGlobalOptions } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";

export function registerInspectCommand(program: Command): void {
  program
    .command("inspect")
    .description("Inspect repository and detect framework, package manager, deployment target")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      try {
        const result = await runCommand("inspect", {
          rootDir: opts.cwd,
          configPath: opts.config,
        });

        if (!opts.json) {
          logger.heading("Repository Inspection");
        }
        console.log(JSON.stringify(result.data, null, 2));
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
