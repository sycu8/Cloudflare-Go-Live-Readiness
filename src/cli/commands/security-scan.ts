import type { Command } from "commander";
import path from "node:path";
import { createScanContext, getOutputDir } from "../../core/context.js";
import { writeTextFile } from "../../core/filesystem.js";
import { generateSarif } from "../../generators/sarif.js";
import { getGlobalOptions, getExitCode } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";

export function registerSecurityScanCommand(program: Command): void {
  program
    .command("security-scan")
    .description("Run security readiness checks")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      try {
        const context = await createScanContext({
          rootDir: opts.cwd,
          configPath: opts.config,
          modules: ["security"],
        });

        const sarif = generateSarif(context.findings, context.rootDir);
        const outputPath = path.join(getOutputDir(context), "security-findings.sarif");
        await writeTextFile(outputPath, sarif, { force: true });

        const securityFindings = context.findings.filter((f) => f.category === "security");

        if (opts.json) {
          console.log(JSON.stringify({ findings: securityFindings, sarif: outputPath }, null, 2));
        } else {
          logger.heading("Security Scan");
          console.log(`Findings: ${securityFindings.length}`);
          console.log(`Security score: ${context.scores.security}/100`);
          logger.success(`SARIF written to ${outputPath}`);
        }

        process.exit(getExitCode(context.productionReady, false));
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
