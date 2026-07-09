import type { Env } from "./types.js";
import { readSourceBytes, type SourceArchiveFormat } from "./sources-cache.js";
import { extractStagedArchive, projectDirHasFiles } from "./import-extract.js";
import { withSandboxRetry } from "./sandbox-retry.js";

type SandboxExec = {
  exec(
    command: string,
    options?: { timeout?: number },
  ): Promise<{ success: boolean; stdout?: string; stderr?: string; exitCode?: number }>;
  writeFile(
    path: string,
    content: string | Uint8Array | ReadableStream<Uint8Array>,
    options?: { encoding?: string },
  ): Promise<unknown>;
};

export type MaterializeProjectOptions = {
  env: Env;
  sandbox: SandboxExec;
  sourceR2Key: string;
  sourceFormat: SourceArchiveFormat;
  materializedSourceKey?: string;
  onExtracting?: () => Promise<void>;
};

export type MaterializeProjectResult = {
  materializedSourceKey: string;
  extracted: boolean;
};

const FILE_CHECK_RETRY = { maxAttempts: 4, baseDelayMs: 800 };

/**
 * Ensure project files exist in the sandbox. Skips R2 download when the current
 * source is already materialized and files are still present (warm sandbox).
 */
export async function materializeProject(
  options: MaterializeProjectOptions,
): Promise<MaterializeProjectResult> {
  const { env, sandbox, sourceR2Key, sourceFormat, materializedSourceKey, onExtracting } = options;

  const sourceChanged =
    materializedSourceKey !== undefined && materializedSourceKey !== sourceR2Key;

  if (!sourceChanged) {
    const hasFiles = await withSandboxRetry(() => projectDirHasFiles(sandbox), FILE_CHECK_RETRY);
    if (hasFiles) {
      return { materializedSourceKey: sourceR2Key, extracted: false };
    }
  }

  if (onExtracting) await onExtracting();
  const archive = await readSourceBytes(env, sourceR2Key);
  await withSandboxRetry(() => extractStagedArchive(sandbox, archive, sourceFormat));
  return { materializedSourceKey: sourceR2Key, extracted: true };
}
