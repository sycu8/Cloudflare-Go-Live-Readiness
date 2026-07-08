import type { Command } from "commander";
import { runCommand } from "../../service/run-command.js";
import { getGlobalOptions } from "../options.js";
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
        const result = await runCommand("smoke-test", {
          rootDir: opts.cwd,
          configPath: opts.config,
          url: options.url,
        });

        const report = result.data as {
          baseUrl: string;
          results: Array<{ ok: boolean; path: string; status?: number; responseTimeMs: number }>;
          findings: Array<{ severity: string; title: string }>;
        };

        if (opts.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          logger.heading(`Smoke test: ${report.baseUrl}`);
          for (const r of report.results) {
            const status = r.ok ? "OK" : "FAIL";
            console.log(
              `${status} ${r.path} — ${r.status ?? "error"} (${r.responseTimeMs}ms)`,
            );
          }
          if (report.findings.length > 0) {
            console.log("\nFindings:");
            for (const f of report.findings) {
              console.log(`- [${f.severity}] ${f.title}`);
            }
          }
        }

        process.exit(result.exitCode);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
