import type { Command } from "commander";
import { createScanContext } from "../../core/context.js";
import { writeAllReports } from "../../core/report.js";
import { getGlobalOptions, getExitCode } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";
import { printScanSummary } from "../output.js";

export function registerScanCommand(program: Command): void {
  program
    .command("scan")
    .description("Run full go-live readiness scan and generate reports")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      try {
        const context = await createScanContext({
          rootDir: opts.cwd,
          configPath: opts.config,
        });

        if (!opts.json) {
          logger.heading("Cloudflare Go-Live Readiness Scan");
        }

        const reports = await writeAllReports(context);

        if (opts.json) {
          console.log(
            JSON.stringify(
              {
                productionReady: context.productionReady,
                scores: context.scores,
                blockers: context.blockers,
                reports: reports.map((r) => r.name),
              },
              null,
              2,
            ),
          );
        } else {
          printScanSummary(context);
          logger.heading("Reports generated");
          for (const r of reports) {
            logger.success(r.name);
          }
        }

        process.exit(getExitCode(context.productionReady, false));
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
