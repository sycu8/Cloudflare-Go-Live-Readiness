import type { Command } from "commander";

export type GlobalOptions = {
  cwd: string;
  config?: string;
  json: boolean;
  verbose: boolean;
  color: boolean;
  skipReports: boolean;
};

export function getGlobalOptions(command: Command): GlobalOptions {
  const root = command.optsWithGlobals();
  return {
    cwd: root.cwd ?? process.cwd(),
    config: root.config,
    json: Boolean(root.json),
    verbose: Boolean(root.verbose),
    color: root.color !== false,
    skipReports: Boolean(root.skipReports),
  };
}

export function getExitCode(productionReady: boolean, hasError: boolean): number {
  if (hasError) return 2;
  if (!productionReady) return 1;
  return 0;
}

export function serviceOptionsFromGlobal(opts: GlobalOptions) {
  return {
    rootDir: opts.cwd,
    configPath: opts.config,
    skipReports: opts.skipReports,
  };
}
