import type { Command } from "commander";
import { runScan } from "../../service/run-scan.js";
import { getGlobalOptions, serviceOptionsFromGlobal } from "../options.js";
import { parseScanModules, SCAN_MODULE_NAMES } from "../../service/scan-modules.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";
import { printScanSummary } from "../output.js";

export function registerScanCommand(program: Command): void {
  program
    .command("scan")
    .description("Run full go-live readiness scan and generate reports")
    .option(
      "--modules <list>",
      `Comma-separated modules (${SCAN_MODULE_NAMES.join(",")})`,
    )
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      const scanOpts = this.opts() as { modules?: string };
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      try {
        if (!opts.json) {
          logger.heading("Cloudflare Go-Live Readiness Scan");
        }

        const result = await runScan({
          ...serviceOptionsFromGlobal(opts),
          modules: parseScanModules(scanOpts.modules),
        });

        if (opts.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          printScanSummary(result.context);
          logger.heading("Reports generated");
          for (const name of result.data.reports ?? []) {
            logger.success(name);
          }
        }

        process.exit(result.exitCode);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
