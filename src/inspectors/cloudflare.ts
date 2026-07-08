import { hasCloudflareConfig } from "./deployment.js";

export async function inspectCloudflare(rootDir: string): Promise<{
  hasWranglerConfig: boolean;
  configFiles: string[];
}> {
  const hasWrangler = await hasCloudflareConfig(rootDir);
  const configFiles: string[] = [];
  const { fileExists } = await import("../core/filesystem.js");
  const path = await import("node:path");

  for (const file of ["wrangler.toml", "wrangler.jsonc"]) {
    if (await fileExists(path.join(rootDir, file))) {
      configFiles.push(file);
    }
  }

  return { hasWranglerConfig: hasWrangler, configFiles };
}
