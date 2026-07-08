import { access, stat } from "node:fs/promises";
import path from "node:path";

export async function validateProjectRoot(rootDir: string): Promise<string> {
  const resolved = path.resolve(rootDir);

  try {
    const info = await stat(resolved);
    if (!info.isDirectory()) {
      throw new Error(`Project root is not a directory: ${resolved}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Project root does not exist: ${resolved}`);
    }
    throw error;
  }

  try {
    await access(resolved);
  } catch {
    throw new Error(`Cannot access project root: ${resolved}`);
  }

  return resolved;
}
