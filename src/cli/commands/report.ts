import type { Command } from "commander";
import { createScanContext } from "../../core/context.js";
import { writeAllReports } from "../../core/report.js";
import { getGlobalOptions } from "../options.js";
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
        const context = await createScanContext({
          rootDir: opts.cwd,
          configPath: opts.config,
        });

        const reports = await writeAllReports(context);

        if (opts.json) {
          console.log(JSON.stringify({ reports: reports.map((r) => r.name) }, null, 2));
        } else {
          logger.heading("Reports generated");
          for (const r of reports) {
            logger.success(r.name);
          }
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
