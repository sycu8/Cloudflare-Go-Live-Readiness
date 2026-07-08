import type { Command } from "commander";
import { createScanContext } from "../../core/context.js";
import { getGlobalOptions, getExitCode } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";
import { printScanSummary } from "../output.js";

export function registerDeployCheckCommand(program: Command): void {
  program
    .command("deploy-check")
    .description("Check deployment readiness (scripts, Cloudflare config, env docs)")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      try {
        const context = await createScanContext({
          rootDir: opts.cwd,
          configPath: opts.config,
          modules: ["deployment", "migration", "security"],
        });

        const deploymentFindings = context.findings.filter(
          (f) => f.category === "deployment" || f.severity === "blocker",
        );

        if (opts.json) {
          console.log(
            JSON.stringify({
              productionReady: context.productionReady,
              deploymentScore: context.scores.deployment,
              findings: deploymentFindings,
            },
            null,
            2,
          ));
        } else {
          logger.heading("Deployment Readiness");
          console.log(`Deployment score: ${context.scores.deployment}/100`);
          printScanSummary(context);
        }

        process.exit(getExitCode(context.productionReady, false));
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
