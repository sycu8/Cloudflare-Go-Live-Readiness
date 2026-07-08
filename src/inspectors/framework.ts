import fg from "fast-glob";
import path from "node:path";
import { fileExists, readTextFile } from "../core/filesystem.js";
import { getDependencyNames } from "../utils/package-json.js";
import type { Framework } from "../config/schema.js";
import type { PackageJson } from "./types.js";
import type { NextJsDetails } from "./types.js";

export async function detectFramework(
  rootDir: string,
  pkg: PackageJson | null,
): Promise<{ framework: Framework; confidence: "high" | "medium" | "low"; nextJs?: NextJsDetails }> {
  const deps = pkg ? getDependencyNames(pkg) : new Set<string>();

  const hasAppDir = await fileExists(path.join(rootDir, "app"));
  const hasPagesDir = await fileExists(path.join(rootDir, "pages"));
  const nextConfigs = await fg(["next.config.{js,mjs,ts}"], { cwd: rootDir });

  if (deps.has("next") || nextConfigs.length > 0 || hasAppDir || hasPagesDir) {
    const middlewareExists = await fileExists(path.join(rootDir, "middleware.ts")) ||
      await fileExists(path.join(rootDir, "middleware.js"));
    const apiRoutes = await detectApiRoutes(rootDir, "nextjs");
    let router: NextJsDetails["router"] = "unknown";
    if (hasAppDir) router = "app";
    else if (hasPagesDir) router = "pages";

    return {
      framework: "nextjs",
      confidence: deps.has("next") ? "high" : "medium",
      nextJs: {
        router,
        hasMiddleware: middlewareExists,
        hasApiRoutes: apiRoutes.length > 0,
        configFiles: nextConfigs,
      },
    };
  }

  const viteConfigs = await fg(["vite.config.{ts,js,mjs}"], { cwd: rootDir });
  if (deps.has("vite") || viteConfigs.length > 0) {
    return { framework: "vite", confidence: deps.has("vite") ? "high" : "medium" };
  }

  if (deps.has("astro")) {
    return { framework: "astro", confidence: "high" };
  }
  if (deps.has("@remix-run/react") || deps.has("@remix-run/node")) {
    return { framework: "remix", confidence: "high" };
  }
  if (deps.has("nuxt") || deps.has("nuxt3")) {
    return { framework: "nuxt", confidence: "high" };
  }
  if (deps.has("express")) {
    return { framework: "express", confidence: "high" };
  }

  if (deps.has("react") && (deps.has("react-scripts") || deps.has("react-dom"))) {
    return { framework: "react-spa", confidence: "medium" };
  }

  if (pkg && (deps.has("typescript") || deps.has("@types/node"))) {
    const hasServerEntry = await fg(["src/index.{ts,js}", "index.{ts,js}"], { cwd: rootDir });
    if (hasServerEntry.length > 0) {
      const content = await readTextFile(path.join(rootDir, hasServerEntry[0]!));
      if (content?.includes("createServer") || content?.includes("http.createServer")) {
        return { framework: "nodejs", confidence: "medium" };
      }
    }
    return { framework: "nodejs", confidence: "low" };
  }

  const htmlFiles = await fg(["**/*.html", "public/**/*.html"], {
    cwd: rootDir,
    ignore: ["node_modules/**"],
  });
  if (!pkg && htmlFiles.length > 0) {
    return { framework: "static", confidence: "high" };
  }
  if (htmlFiles.length > 0 && !deps.has("react") && !deps.has("vue")) {
    return { framework: "static", confidence: "medium" };
  }

  return { framework: "unknown", confidence: "low" };
}

export async function detectApiRoutes(
  rootDir: string,
  framework: Framework,
): Promise<string[]> {
  const routes: string[] = [];

  if (framework === "nextjs") {
    const appRoutes = await fg(["app/**/route.{ts,js}", "pages/api/**/*.{ts,js}"], {
      cwd: rootDir,
      onlyFiles: true,
    });
    for (const file of appRoutes) {
      if (file.startsWith("app/")) {
        const route = file
          .replace(/^app/, "")
          .replace(/\/route\.(ts|js)$/, "")
          .replace(/\/\([^)]+\)/g, "") || "/";
        routes.push(route === "" ? "/" : route);
      } else {
        const route = file
          .replace(/^pages/, "")
          .replace(/\.(ts|js)$/, "")
          .replace(/\/index$/, "");
        routes.push(route || "/api");
      }
    }
  }

  if (framework === "express" || framework === "nodejs") {
    const serverFiles = await fg(["**/*.{ts,js}"], {
      cwd: rootDir,
      ignore: ["node_modules/**", "dist/**"],
    });
    for (const file of serverFiles.slice(0, 100)) {
      const content = await readTextFile(path.join(rootDir, file));
      if (!content) continue;
      const matches = content.matchAll(/\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
      for (const m of matches) {
        routes.push(m[2]!);
      }
    }
  }

  return [...new Set(routes)].sort();
}

export async function detectPageRoutes(rootDir: string, framework: Framework): Promise<string[]> {
  const routes: string[] = ["/"];

  if (framework === "nextjs") {
    const pageFiles = await fg(
      ["app/**/page.{tsx,jsx,ts,js}", "pages/**/*.{tsx,jsx,ts,js}"],
      { cwd: rootDir, ignore: ["**/api/**", "**/node_modules/**"] },
    );
    for (const file of pageFiles) {
      if (file.startsWith("app/")) {
        const route = file
          .replace(/^app/, "")
          .replace(/\/page\.(tsx|jsx|ts|js)$/, "")
          .replace(/\/\([^)]+\)/g, "");
        if (route === "" || route === "/") routes.push("/");
        else routes.push(route);
      } else if (file.startsWith("pages/") && !file.includes("/api/")) {
        const route = file
          .replace(/^pages/, "")
          .replace(/\.(tsx|jsx|ts|js)$/, "")
          .replace(/\/index$/, "");
        routes.push(route || "/");
      }
    }
  }

  if (framework === "vite" || framework === "react-spa" || framework === "static") {
    const htmlFiles = await fg(["index.html", "public/**/*.html"], { cwd: rootDir });
    for (const file of htmlFiles) {
      if (file === "index.html") routes.push("/");
      else {
        const route = "/" + file.replace(/^public\//, "").replace(/index\.html$/, "").replace(/\.html$/, "");
        routes.push(route.replace(/\/$/, "") || "/");
      }
    }
  }

  return [...new Set(routes)].sort();
}

export async function detectAuthPatterns(rootDir: string): Promise<boolean> {
  const files = await fg(["**/*.{ts,tsx,js,jsx}"], {
    cwd: rootDir,
    ignore: ["node_modules/**", "dist/**", ".next/**"],
  });

  for (const file of files.slice(0, 200)) {
    const content = await readTextFile(path.join(rootDir, file));
    if (!content) continue;
    if (
      /next-auth|NextAuth|clerk|auth0|lucia|better-auth|passport|session|jwt\.sign|signIn|signOut/i.test(
        content,
      )
    ) {
      return true;
    }
  }
  return false;
}
