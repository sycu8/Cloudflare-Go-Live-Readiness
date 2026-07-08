import type { Command } from "commander";

export type GlobalOptions = {
  cwd: string;
  config?: string;
  json: boolean;
  verbose: boolean;
  color: boolean;
};

export function getGlobalOptions(command: Command): GlobalOptions {
  const root = command.optsWithGlobals();
  return {
    cwd: root.cwd ?? process.cwd(),
    config: root.config,
    json: Boolean(root.json),
    verbose: Boolean(root.verbose),
    color: root.color !== false,
  };
}

export function getExitCode(productionReady: boolean, hasError: boolean): number {
  if (hasError) return 2;
  if (!productionReady) return 1;
  return 0;
}
