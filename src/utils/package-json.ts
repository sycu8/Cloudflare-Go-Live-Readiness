import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PackageJson } from "../inspectors/types.js";

export async function readPackageJson(rootDir: string): Promise<PackageJson | null> {
  try {
    const content = await readFile(path.join(rootDir, "package.json"), "utf8");
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
  }
}

export function getDependencyNames(pkg: PackageJson): Set<string> {
  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };
  return new Set(Object.keys(deps ?? {}));
}

export function hasScript(pkg: PackageJson, name: string): boolean {
  return Boolean(pkg.scripts?.[name]);
}

export function getProjectName(pkg: PackageJson | null, fallback: string): string {
  return pkg?.name ?? fallback;
}
