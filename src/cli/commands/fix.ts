import type { Command } from "commander";
import { createScanContext } from "../../core/context.js";
import { generateAiAssets } from "../../generators/ai-assets.js";
import { generateSeoAssets } from "../../generators/seo-assets.js";
import { getGlobalOptions } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";

export function registerFixCommand(program: Command): void {
  program
    .command("fix")
    .description("Generate safe readiness assets (only with explicit flags)")
    .option("--ai-readiness", "Generate AI readiness files (robots.txt, llms.txt, etc.)")
    .option("--seo", "Generate SEO assets and suggestions")
    .option("--force", "Overwrite existing generated files")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      const fixOpts = this.opts();
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      if (!fixOpts.aiReadiness && !fixOpts.seo) {
        logger.error("Specify --ai-readiness and/or --seo. No files modified.");
        process.exit(2);
      }

      try {
        const context = await createScanContext({
          rootDir: opts.cwd,
          configPath: opts.config,
          modules: [],
        });

        const results: Array<{ file: string; status: string }> = [];

        if (fixOpts.aiReadiness) {
          logger.heading("Generating AI readiness assets");
          const aiResults = await generateAiAssets(context, { force: fixOpts.force });
          results.push(...aiResults);
        }

        if (fixOpts.seo) {
          logger.heading("Generating SEO assets");
          const seoResults = await generateSeoAssets(context, { force: fixOpts.force });
          results.push(...seoResults);
        }

        if (opts.json) {
          console.log(JSON.stringify({ results }, null, 2));
        } else {
          for (const r of results) {
            const label = r.status === "skipped" ? "skipped (exists)" : r.status;
            logger.success(`${r.file}: ${label}`);
          }
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
