import path from "node:path";
import { fileExists } from "../core/filesystem.js";

export const PUBLIC_ASSET_CANDIDATES: Record<string, string[]> = {
  "robots.txt": ["public/robots.txt", "robots.txt", "static/robots.txt"],
  "sitemap.xml": ["public/sitemap.xml", "sitemap.xml", "static/sitemap.xml"],
  "llms.txt": ["public/llms.txt", "llms.txt"],
  "llms-full.txt": ["public/llms-full.txt", "llms-full.txt"],
};

export async function resolvePublicAsset(
  rootDir: string,
  assetKey: keyof typeof PUBLIC_ASSET_CANDIDATES,
): Promise<string | null> {
  for (const rel of PUBLIC_ASSET_CANDIDATES[assetKey]) {
    const full = path.join(rootDir, rel);
    if (await fileExists(full)) {
      return rel;
    }
  }
  return null;
}

export async function publicAssetExists(
  rootDir: string,
  assetKey: keyof typeof PUBLIC_ASSET_CANDIDATES,
): Promise<boolean> {
  return (await resolvePublicAsset(rootDir, assetKey)) !== null;
}
