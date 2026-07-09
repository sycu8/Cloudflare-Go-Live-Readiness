import { describe, it, expect, vi, beforeEach } from "vitest";
import { materializeProject } from "../../workers/src/project-materialize.js";

const env = {} as Parameters<typeof materializeProject>[0]["env"];

function mockSandbox(hasFiles: boolean) {
  return {
    exec: vi.fn(async () => ({ success: hasFiles })),
    writeFile: vi.fn(async () => {}),
  };
}

vi.mock("../../workers/src/sources-cache.js", () => ({
  readSourceBytes: vi.fn(async () => new Uint8Array([1, 2, 3])),
}));

vi.mock("../../workers/src/import-extract.js", () => ({
  projectDirHasFiles: vi.fn(async (sandbox: { exec: () => Promise<{ success: boolean }> }) => {
    const result = await sandbox.exec("check");
    return result.success;
  }),
  extractStagedArchive: vi.fn(async () => {}),
}));

describe("materializeProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips R2 read when source is materialized and sandbox has files", async () => {
    const sandbox = mockSandbox(true);
    const { readSourceBytes } = await import("../../workers/src/sources-cache.js");
    const { extractStagedArchive } = await import("../../workers/src/import-extract.js");

    const result = await materializeProject({
      env,
      sandbox,
      sourceR2Key: "sources/s1/archive.tar.gz",
      sourceFormat: "tar",
      materializedSourceKey: "sources/s1/archive.tar.gz",
    });

    expect(result).toEqual({
      materializedSourceKey: "sources/s1/archive.tar.gz",
      extracted: false,
    });
    expect(readSourceBytes).not.toHaveBeenCalled();
    expect(extractStagedArchive).not.toHaveBeenCalled();
  });

  it("skips R2 read when warm sandbox has files but session key not persisted yet", async () => {
    const sandbox = mockSandbox(true);
    const { readSourceBytes } = await import("../../workers/src/sources-cache.js");

    const result = await materializeProject({
      env,
      sandbox,
      sourceR2Key: "sources/s1/archive.tar.gz",
      sourceFormat: "tar",
    });

    expect(result.extracted).toBe(false);
    expect(readSourceBytes).not.toHaveBeenCalled();
  });

  it("extracts from R2 when source key changed even if old files remain", async () => {
    const sandbox = mockSandbox(true);
    const { readSourceBytes } = await import("../../workers/src/sources-cache.js");
    const { extractStagedArchive } = await import("../../workers/src/import-extract.js");

    const result = await materializeProject({
      env,
      sandbox,
      sourceR2Key: "sources/s2/archive.tar.gz",
      sourceFormat: "tar",
      materializedSourceKey: "sources/s1/archive.tar.gz",
    });

    expect(result.extracted).toBe(true);
    expect(readSourceBytes).toHaveBeenCalled();
    expect(extractStagedArchive).toHaveBeenCalled();
  });

  it("extracts from R2 when sandbox has no files", async () => {
    const sandbox = mockSandbox(false);
    const { readSourceBytes } = await import("../../workers/src/sources-cache.js");
    const { extractStagedArchive } = await import("../../workers/src/import-extract.js");

    const result = await materializeProject({
      env,
      sandbox,
      sourceR2Key: "sources/s1/archive.tar.gz",
      sourceFormat: "tar",
      materializedSourceKey: "sources/s1/archive.tar.gz",
    });

    expect(result.extracted).toBe(true);
    expect(readSourceBytes).toHaveBeenCalled();
    expect(extractStagedArchive).toHaveBeenCalled();
  });
});
