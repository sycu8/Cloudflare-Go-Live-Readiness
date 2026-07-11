import fg from "fast-glob";
import type { Options } from "fast-glob";
import {
  SCAN_EXCLUDE_DIRS,
  WINDOWS_PROFILE_JUNCTIONS,
} from "../config/default-rules.js";

const DEFAULT_SCAN_IGNORE = [
  ...SCAN_EXCLUDE_DIRS.map((dir) => `**/${dir}/**`),
  ...WINDOWS_PROFILE_JUNCTIONS.map((dir) => `**/${dir}/**`),
];

export type ProjectGlobOptions = Omit<Options, "cwd"> & {
  cwd: string;
};

/** Project-scoped glob with Windows-safe defaults (no symlink follow, EPERM suppressed). */
export async function projectGlob(
  patterns: string | string[],
  options: ProjectGlobOptions,
): Promise<string[]> {
  const ignore = [...DEFAULT_SCAN_IGNORE, ...(options.ignore ?? [])];
  return fg(patterns, {
    followSymbolicLinks: false,
    suppressErrors: true,
    ...options,
    ignore,
  });
}

export function projectScanIgnore(extra: string[] = []): string[] {
  return [...DEFAULT_SCAN_IGNORE, ...extra];
}
