import type { Command } from "commander";
import { runCommand } from "../../service/run-command.js";
import { getGlobalOptions, serviceOptionsFromGlobal } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";
import { printScanSummary } from "../output.js";
import type { ScanContext } from "../../core/context.js";
import type { Finding } from "../../config/schema.js";

export function registerDeployCheckCommand(program: Command): void {
  program
    .command("deploy-check")
    .description("Check deployment readiness (scripts, Cloudflare config, env docs)")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      try {
        const result = await runCommand("deploy-check", serviceOptionsFromGlobal(opts));

        const data = result.data as {
          deploymentScore: number;
          productionReady: boolean;
          scores: ScanContext["scores"];
          blockers: Finding[];
          findings: Finding[];
          inspection: ScanContext["inspection"];
        };

        if (opts.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          logger.heading("Deployment Readiness");
          console.log(`Deployment score: ${data.deploymentScore}/100`);
          printScanSummary({
            rootDir: opts.cwd,
            config: { outputDir: "." } as ScanContext["config"],
            inspection: data.inspection,
            findings: data.findings,
            scores: data.scores,
            productionReady: data.productionReady,
            blockers: data.blockers,
            scannedAt: new Date().toISOString(),
          });
        }

        process.exit(result.exitCode);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
