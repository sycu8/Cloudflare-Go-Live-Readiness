import type { Command } from "commander";
import { runCommand } from "../../service/run-command.js";
import { getGlobalOptions, serviceOptionsFromGlobal } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";

export function registerFixCommand(program: Command): void {
  program
    .command("fix")
    .description("Generate safe readiness assets (only with explicit flags)")
    .option("--ai-readiness", "Generate AI readiness files (llms.txt, openapi.json, etc.)")
    .option("--seo", "Generate SEO assets (sitemap.xml, robots.txt, suggestions)")
    .option("--finding <id>", "Run fix for a specific finding id from the last scan")
    .option("--rescan", "Re-run scan after applying fixes")
    .option("--force", "Overwrite existing generated files")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      const fixOpts = this.opts() as {
        aiReadiness?: boolean;
        seo?: boolean;
        finding?: string;
        rescan?: boolean;
        force?: boolean;
      };
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      if (!fixOpts.aiReadiness && !fixOpts.seo && !fixOpts.finding) {
        logger.error("Specify --ai-readiness, --seo, or --finding <id>. No files modified.");
        process.exit(2);
      }

      try {
        const result = await runCommand("fix", {
          ...serviceOptionsFromGlobal(opts),
          aiReadiness: fixOpts.aiReadiness,
          seo: fixOpts.seo,
          findingId: fixOpts.finding,
          rescan: fixOpts.rescan,
          force: fixOpts.force,
        });

        const data = result.data as {
          results: Array<{ file: string; status: string }>;
          findingId?: string | null;
        };

        if (opts.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          for (const r of data.results) {
            const label = r.status === "skipped" ? "skipped (exists)" : r.status;
            logger.success(`${r.file}: ${label}`);
          }
          if (fixOpts.rescan) {
            logger.success("Rescan complete — see updated reports.");
          }
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
