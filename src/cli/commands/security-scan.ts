import type { Command } from "commander";
import { runCommand } from "../../service/run-command.js";
import { getGlobalOptions } from "../options.js";
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
        const result = await runCommand("security-scan", {
          rootDir: opts.cwd,
          configPath: opts.config,
        });

        const data = result.data as {
          findings: unknown[];
          sarif: string;
          score: number;
        };

        if (opts.json) {
          console.log(JSON.stringify({ findings: data.findings, sarif: data.sarif }, null, 2));
        } else {
          logger.heading("Security Scan");
          console.log(`Findings: ${data.findings.length}`);
          console.log(`Security score: ${data.score}/100`);
          logger.success(`SARIF written to ${data.sarif}`);
        }

        process.exit(result.exitCode);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
