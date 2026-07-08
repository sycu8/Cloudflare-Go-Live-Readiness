import type { Command } from "commander";
import path from "node:path";
import { createScanContext, getOutputDir } from "../../core/context.js";
import { writeTextFile } from "../../core/filesystem.js";
import {
  buildOptimizePayload,
  callAiOptimizeApi,
  getAiWorkerUrl,
  getAiModel,
} from "../../modules/ai-optimize/index.js";
import { getGlobalOptions } from "../options.js";
import { logger, setVerbose, setUseColor } from "../../utils/logger.js";

export function registerAiOptimizeCommand(program: Command): void {
  program
    .command("ai-optimize")
    .description(
      "Use Cloudflare Workers AI (GPT via AI Gateway) for migration/refactor suggestions",
    )
    .option(
      "--focus <area>",
      "Focus area: migration, security, or all",
      "all",
    )
    .option(
      "--worker-url <url>",
      "cf-ready AI Worker URL (default: config or production worker)",
    )
    .option("--model <model>", "AI model e.g. openai/gpt-4o-mini, openai/gpt-4o")
    .option("--ai-token <token>", "Bearer token if AI worker requires auth")
    .option("--dry-run", "Build payload only, do not call AI worker")
    .action(async function (this: Command) {
      const opts = getGlobalOptions(this);
      const cmdOpts = this.opts() as {
        focus: string;
        workerUrl?: string;
        model?: string;
        aiToken?: string;
        dryRun?: boolean;
      };
      setVerbose(opts.verbose);
      setUseColor(opts.color);

      const focus = ["migration", "security", "all"].includes(cmdOpts.focus)
        ? (cmdOpts.focus as "migration" | "security" | "all")
        : "all";

      try {
        const context = await createScanContext({
          rootDir: opts.cwd,
          configPath: opts.config,
        });

        if (cmdOpts.model) {
          context.config.ai = {
            ...context.config.ai,
            model: cmdOpts.model,
            gatewayId: context.config.ai?.gatewayId ?? "default",
          };
        }

        const payload = await buildOptimizePayload(context, focus);
        const workerUrl = cmdOpts.workerUrl ?? getAiWorkerUrl(context.config);

        if (cmdOpts.dryRun) {
          if (opts.json) {
            console.log(JSON.stringify({ workerUrl, payload }, null, 2));
          } else {
            logger.info(`Dry run — would POST to ${workerUrl}/api/optimize`);
            console.log(JSON.stringify(payload, null, 2));
          }
          return;
        }

        if (!opts.json) {
          logger.heading("cf-ready AI Optimize (Cloudflare Workers AI)");
          logger.info(`Worker: ${workerUrl}`);
          logger.info(`Model: ${getAiModel(context.config)}`);
        }

        const result = await callAiOptimizeApi(
          workerUrl,
          payload,
          cmdOpts.aiToken ?? context.config.ai?.apiToken ?? process.env.CF_READY_AI_TOKEN,
        );

        const markdown = String(result.markdown ?? "");
        const outputPath = path.join(getOutputDir(context), "cf-ready-ai-optimize.md");
        await writeTextFile(outputPath, markdown, { force: true });

        if (opts.json) {
          console.log(JSON.stringify({ ...result, reportPath: outputPath }, null, 2));
        } else {
          logger.success(`Report: ${outputPath}`);
          console.log("\n" + markdown);
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
