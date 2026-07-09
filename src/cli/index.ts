import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { registerScanCommand } from "./commands/scan.js";
import { registerInspectCommand } from "./commands/inspect.js";
import { registerMigrationPlanCommand } from "./commands/migration-plan.js";
import { registerSecurityScanCommand } from "./commands/security-scan.js";
import { registerAiReadyCommand } from "./commands/ai-ready.js";
import { registerSeoReadyCommand } from "./commands/seo-ready.js";
import { registerFixCommand } from "./commands/fix.js";
import { registerReportCommand } from "./commands/report.js";
import { registerDeployCheckCommand } from "./commands/deploy-check.js";
import { registerSmokeTestCommand } from "./commands/smoke-test.js";
import { registerAiOptimizeCommand } from "./commands/ai-optimize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };

const program = new Command();

program
  .name("cf-ready")
  .description(
    "Cloudflare Go-Live Readiness — migration, security, AI, SEO, and deployment checks",
  )
  .version(pkg.version)
  .option("--cwd <path>", "Project root directory", process.cwd())
  .option("--config <path>", "Path to cf-ready.config.json")
  .option("--json", "Output machine-readable JSON")
  .option("--skip-reports", "Skip writing report files to disk (faster; use with --json)")
  .option("--verbose", "Verbose logging")
  .option("--no-color", "Disable colored output");

registerScanCommand(program);
registerInspectCommand(program);
registerMigrationPlanCommand(program);
registerSecurityScanCommand(program);
registerAiReadyCommand(program);
registerSeoReadyCommand(program);
registerFixCommand(program);
registerReportCommand(program);
registerDeployCheckCommand(program);
registerSmokeTestCommand(program);
registerAiOptimizeCommand(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
});
