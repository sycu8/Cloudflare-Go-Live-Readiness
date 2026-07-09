import type { SourceArchiveFormat } from "./sources-cache.js";

export const PROJECT_DIR = "/workspace/project";
export const TAR_ARCHIVE_PATH = "/tmp/repo-archive.tar.gz";
export const ZIP_ARCHIVE_PATH = "/tmp/upload.zip";

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

type ExecResult = { success: boolean; stdout?: string; stderr?: string; exitCode?: number };

export function formatExtractFailure(
  result: ExecResult,
  step: "extract" | "unzip",
): string {
  const detail = (result.stderr || result.stdout || "").trim();
  if (/file error|bad zipfile|End-of-central-directory/i.test(detail)) {
    return step === "unzip"
      ? "Invalid or corrupted ZIP file. Re-export the archive and try again."
      : "Archive extraction failed. The R2 copy may be incomplete — try importing again.";
  }
  if (detail) return detail;
  return step === "unzip" ? "Failed to unzip upload." : "Failed to extract repository archive.";
}

/**
 * Execution plane: pull staged archive from R2 stream into sandbox and extract.
 */
export async function extractStagedArchive(
  sandbox: SandboxExec,
  archive: Uint8Array,
  format: SourceArchiveFormat,
): Promise<void> {
  await sandbox.exec("mkdir -p /tmp", { timeout: 10000 });
  await sandbox.exec(`rm -rf ${PROJECT_DIR} && mkdir -p ${PROJECT_DIR}`, { timeout: 30000 });

  const archivePath = format === "zip" ? ZIP_ARCHIVE_PATH : TAR_ARCHIVE_PATH;
  await sandbox.writeFile(archivePath, archive);

  if (format === "zip") {
    const unzip = await sandbox.exec(
      `unzip -q -o ${archivePath} -d ${PROJECT_DIR} && rm -f ${archivePath}`,
      { timeout: 180000 },
    );
    if (!unzip.success) {
      throw new Error(formatExtractFailure(unzip, "unzip"));
    }
  } else {
    const extract = await sandbox.exec(
      `tar -xzf ${archivePath} -C ${PROJECT_DIR} --strip-components=1 && rm -f ${archivePath}`,
      { timeout: 180000 },
    );
    if (!extract.success) {
      throw new Error(formatExtractFailure(extract, "extract"));
    }
  }

  const verify = await sandbox.exec(
    `test -n "$(ls -A ${PROJECT_DIR} 2>/dev/null | head -1)"`,
    { timeout: 10000 },
  );
  if (!verify.success) {
    throw new Error(
      "Archive extracted but the project folder is empty. Check the branch or repository URL.",
    );
  }
}

/** Quick check whether project files are present (container may have been recycled). */
export async function projectDirHasFiles(sandbox: SandboxExec): Promise<boolean> {
  const check = await sandbox.exec(
    `test -n "$(ls -A ${PROJECT_DIR} 2>/dev/null | head -1)"`,
    { timeout: 10000 },
  );
  return check.success;
}
