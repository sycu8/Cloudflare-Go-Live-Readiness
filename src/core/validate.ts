import { access, stat } from "node:fs/promises";
import path from "node:path";
import { fileExists } from "./filesystem.js";

const PROJECT_MARKERS = [
  "package.json",
  "wrangler.toml",
  "wrangler.jsonc",
  "index.html",
  "cf-ready.config.json",
] as const;

async function looksLikeProjectRoot(resolved: string): Promise<boolean> {
  for (const marker of PROJECT_MARKERS) {
    if (await fileExists(path.join(resolved, marker))) return true;
  }
  try {
    const gitDir = await stat(path.join(resolved, ".git"));
    if (gitDir.isDirectory()) return true;
  } catch {
    /* not a git repo */
  }
  return false;
}

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

  if (!(await looksLikeProjectRoot(resolved))) {
    throw new Error(
      `No project found in ${resolved}. Change to your app folder or pass --cwd <path> (expected package.json, wrangler config, index.html, or .git).`,
    );
  }

  return resolved;
}
