import { describe, it, expect, vi } from "vitest";
import {
  formatExtractFailure,
  extractStagedArchive,
  projectDirHasFiles,
  PROJECT_DIR,
  TAR_ARCHIVE_PATH,
} from "../../workers/src/import-extract.js";

function mockSandbox(overrides?: {
  execResults?: Array<{ success: boolean; stdout?: string; stderr?: string }>;
}) {
  const queue = [...(overrides?.execResults ?? [])];
  const writes: Array<{ path: string }> = [];
  return {
    writes,
    exec: vi.fn(async () => queue.shift() ?? { success: true }),
    writeFile: vi.fn(async (path: string) => {
      writes.push({ path });
    }),
  };
}

describe("import-extract", () => {
  it("formatExtractFailure maps zip corruption", () => {
    expect(
      formatExtractFailure({ success: false, stderr: "bad zipfile" }, "unzip"),
    ).toContain("Invalid or corrupted ZIP");
  });

  it("formatExtractFailure maps tar file errors", () => {
    expect(
      formatExtractFailure({ success: false, stderr: "file error" }, "extract"),
    ).toContain("R2 copy may be incomplete");
  });

  it("extractStagedArchive writes tar.gz and extracts with strip-components", async () => {
    const sandbox = mockSandbox({
      execResults: [
        { success: true },
        { success: true },
        { success: true },
        { success: true },
      ],
    });
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array([1, 2, 3]));
        c.close();
      },
    });

    await extractStagedArchive(sandbox, stream, "tar.gz");

    expect(sandbox.writeFile).toHaveBeenCalledWith(TAR_ARCHIVE_PATH, stream);
    expect(sandbox.exec).toHaveBeenCalledWith(
      expect.stringContaining(`tar -xzf ${TAR_ARCHIVE_PATH} -C ${PROJECT_DIR} --strip-components=1`),
      expect.any(Object),
    );
  });

  it("projectDirHasFiles reflects exec test result", async () => {
    const empty = mockSandbox({ execResults: [{ success: false }] });
    await expect(projectDirHasFiles(empty)).resolves.toBe(false);

    const filled = mockSandbox({ execResults: [{ success: true }] });
    await expect(projectDirHasFiles(filled)).resolves.toBe(true);
  });
});
