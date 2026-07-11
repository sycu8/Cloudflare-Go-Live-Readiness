import { projectGlob } from "../utils/glob.js";
import path from "node:path";
import { fileExists } from "../core/filesystem.js";
import type { PackageManager } from "../config/schema.js";

const LOCKFILES: Array<{ file: string; manager: PackageManager }> = [
  { file: "pnpm-lock.yaml", manager: "pnpm" },
  { file: "yarn.lock", manager: "yarn" },
  { file: "bun.lockb", manager: "bun" },
  { file: "package-lock.json", manager: "npm" },
];

export async function detectPackageManager(rootDir: string): Promise<PackageManager> {
  for (const { file, manager } of LOCKFILES) {
    if (await fileExists(path.join(rootDir, file))) {
      return manager;
    }
  }
  return "npm";
}

export async function findDetectedFiles(rootDir: string): Promise<string[]> {
  const patterns = [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "vite.config.ts",
    "vite.config.js",
    "wrangler.toml",
    "wrangler.jsonc",
    ".env",
    ".env.local",
    ".env.production",
    ".gitignore",
    "Dockerfile",
    "vercel.json",
    "netlify.toml",
    "astro.config.mjs",
    "remix.config.js",
    "nuxt.config.ts",
    "public/robots.txt",
    "public/sitemap.xml",
    "public/llms.txt",
    "public/llms-full.txt",
    "robots.txt",
    "sitemap.xml",
    "cf-ready.config.json",
    "openapi.json",
    "openapi.yaml",
    "mcp-server-card.json",
    "auth.md",
    ".github/workflows/*",
  ];

  const matches = await projectGlob(patterns, {
    cwd: rootDir,
    onlyFiles: true,
    dot: true,
    unique: true,
  });

  return matches.sort();
}

export async function buildImportantFilesMap(
  rootDir: string,
  detectedFiles: string[],
): Promise<Record<string, boolean>> {
  const keys = [
    "package.json",
    "wrangler.toml",
    "wrangler.jsonc",
    ".env",
    ".env.local",
    ".gitignore",
    "Dockerfile",
    "public/robots.txt",
    "public/sitemap.xml",
    "public/llms.txt",
    "public/llms-full.txt",
    "robots.txt",
    "sitemap.xml",
    "cf-ready.config.json",
  ];

  const map: Record<string, boolean> = {};
  const detectedSet = new Set(detectedFiles);
  for (const key of keys) {
    map[key] = detectedSet.has(key) || (await fileExists(path.join(rootDir, key)));
  }
  return map;
}
