import type { Command } from "commander";
import { createScanContext } from "../../core/context.js";
import { getGlobalOptions } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";
import { printInspection } from "../output.js";

export function registerInspectCommand(program: Command): void {
  program
    .command("inspect")
    .description("Inspect repository and detect framework, package manager, deployment target")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      try {
        const context = await createScanContext({
          rootDir: opts.cwd,
          configPath: opts.config,
          modules: [],
        });

        if (opts.json) {
          printInspection(context);
        } else {
          logger.heading("Repository Inspection");
          printInspection(context);
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
