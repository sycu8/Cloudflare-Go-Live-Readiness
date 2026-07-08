import type { Command } from "commander";
import { loadConfig } from "../../inspectors/repository.js";
import { inspectRepository } from "../../inspectors/repository.js";
import { runSmokeTest } from "../../modules/smoke-test/index.js";
import { validateProjectRoot } from "../../core/validate.js";
import { getGlobalOptions, getExitCode } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";

export function registerSmokeTestCommand(program: Command): void {
  program
    .command("smoke-test")
    .description("Run post-deployment HTTP smoke tests against a live URL")
    .requiredOption("--url <url>", "Production or staging URL to test")
    .action(async function (this: Command, options: { url: string }) {
      const opts = getGlobalOptions(this);
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      try {
        const rootDir = await validateProjectRoot(opts.cwd);
        const config = await loadConfig(rootDir, opts.config);
        const inspection = await inspectRepository(rootDir);
        const report = await runSmokeTest(options.url, config, inspection);

        if (opts.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          logger.heading(`Smoke test: ${report.baseUrl}`);
          for (const result of report.results) {
            const status = result.ok ? "OK" : "FAIL";
            console.log(
              `${status} ${result.path} — ${result.status ?? "error"} (${result.responseTimeMs}ms)`,
            );
          }
          if (report.findings.length > 0) {
            console.log("\nFindings:");
            for (const f of report.findings) {
              console.log(`- [${f.severity}] ${f.title}`);
            }
          }
        }

        const hasBlocker = report.findings.some((f) => f.severity === "blocker");
        process.exit(getExitCode(!hasBlocker, false));
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
