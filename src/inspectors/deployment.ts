import path from "node:path";
import { fileExists } from "../core/filesystem.js";
import type { DeploymentTarget } from "../config/schema.js";
import type { PackageJson } from "./types.js";

export async function detectDeploymentTarget(
  rootDir: string,
  pkg: PackageJson | null,
): Promise<DeploymentTarget> {
  if (await fileExists(path.join(rootDir, "wrangler.toml")) ||
      await fileExists(path.join(rootDir, "wrangler.jsonc"))) {
    const wrangler = await readWranglerHint(rootDir);
    if (wrangler.includes("workers")) return "cloudflare-workers";
    return "cloudflare-pages";
  }

  if (await fileExists(path.join(rootDir, "vercel.json")) ||
      pkg?.dependencies?.["@vercel/analytics"]) {
    return "vercel";
  }

  if (await fileExists(path.join(rootDir, "netlify.toml"))) {
    return "netlify";
  }

  if (await fileExists(path.join(rootDir, "Dockerfile")) ||
      await fileExists(path.join(rootDir, "docker-compose.yml"))) {
    return "docker-vps";
  }

  const pagesConfig = await fileExists(path.join(rootDir, ".github/workflows/pages.yml")) ||
    await fileExists(path.join(rootDir, ".github/workflows/cloudflare-pages.yml"));
  if (pagesConfig) return "cloudflare-pages";

  return "unknown";
}

async function readWranglerHint(rootDir: string): Promise<string> {
  const { readTextFile } = await import("../core/filesystem.js");
  const toml = await readTextFile(path.join(rootDir, "wrangler.toml"));
  const jsonc = await readTextFile(path.join(rootDir, "wrangler.jsonc"));
  return (toml ?? jsonc ?? "").toLowerCase();
}

export async function hasCloudflareConfig(rootDir: string): Promise<boolean> {
  return (
    (await fileExists(path.join(rootDir, "wrangler.toml"))) ||
    (await fileExists(path.join(rootDir, "wrangler.jsonc")))
  );
}
