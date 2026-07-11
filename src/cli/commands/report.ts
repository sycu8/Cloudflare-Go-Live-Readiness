import type { Command } from "commander";
import { runCommand } from "../../service/run-command.js";
import { getGlobalOptions, serviceOptionsFromGlobal } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";

export function registerReportCommand(program: Command): void {
  program
    .command("report")
    .description("Generate all go-live report files from a fresh scan")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      try {
        const result = await runCommand("report", serviceOptionsFromGlobal(opts));

        const data = result.data as { reports: string[] };

        if (opts.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          logger.heading("Reports generated");
          for (const name of data.reports) {
            logger.success(name);
          }
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
