import { access, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export async function writeTextFile(
  filePath: string,
  content: string,
  options?: { force?: boolean },
): Promise<"created" | "skipped" | "overwritten"> {
  const exists = await fileExists(filePath);
  if (exists && !options?.force) {
    return "skipped";
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  return exists ? "overwritten" : "created";
}

export async function writeBinaryFile(
  filePath: string,
  content: Uint8Array,
  options?: { force?: boolean },
): Promise<"created" | "skipped" | "overwritten"> {
  const exists = await fileExists(filePath);
  if (exists && !options?.force) {
    return "skipped";
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
  return exists ? "overwritten" : "created";
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}
