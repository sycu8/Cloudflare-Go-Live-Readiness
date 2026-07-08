import path from "node:path";

export function resolveProjectPath(rootDir: string, ...segments: string[]): string {
  return path.resolve(rootDir, ...segments);
}

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

export function relativeToRoot(rootDir: string, filePath: string): string {
  return toPosixPath(path.relative(rootDir, filePath));
}

export function normalizeRoute(route: string): string {
  if (!route.startsWith("/")) {
    return `/${route}`;
  }
  return route;
}

export function joinUrl(baseUrl: string, route: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const r = normalizeRoute(route);
  return `${base}${r}`;
}
