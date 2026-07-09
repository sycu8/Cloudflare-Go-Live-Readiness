import type { Command } from "commander";
import { runCommand } from "../../service/run-command.js";
import { getAiModel } from "../../modules/ai-optimize/index.js";
import { getGlobalOptions, serviceOptionsFromGlobal } from "../options.js";
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
        const result = await runCommand("ai-optimize", {
          ...serviceOptionsFromGlobal(opts),
          focus,
          workerUrl: cmdOpts.workerUrl,
          model: cmdOpts.model,
          aiToken: cmdOpts.aiToken,
          dryRun: cmdOpts.dryRun,
        });

        if (cmdOpts.dryRun) {
          if (opts.json) {
            console.log(JSON.stringify(result.data, null, 2));
          } else {
            const data = result.data as { workerUrl: string; payload: unknown };
            logger.info(`Dry run — would POST to ${data.workerUrl}/api/optimize`);
            console.log(JSON.stringify(data.payload, null, 2));
          }
          return;
        }

        const data = result.data as { reportPath: string; model?: string };

        if (!opts.json) {
          logger.heading("cf-ready AI Optimize (Cloudflare Workers AI)");
          if (cmdOpts.workerUrl) logger.info(`Worker: ${cmdOpts.workerUrl}`);
          logger.info(`Model: ${data.model ?? getAiModel({} as never)}`);
        }

        if (opts.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          logger.success(`Report: ${data.reportPath}`);
          if (result.markdown) console.log("\n" + result.markdown);
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
}
