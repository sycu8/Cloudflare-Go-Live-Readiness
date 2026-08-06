import { projectGlob } from "../utils/glob.js";
import path from "node:path";
import { fileExists, readTextFile } from "../core/filesystem.js";
import { getDependencyNames } from "../utils/package-json.js";
import type { Framework } from "../config/schema.js";
import type {
  AstroDetails,
  HonoDetails,
  NextJsDetails,
  PackageJson,
  RemixDetails,
} from "./types.js";

export async function detectFramework(
  rootDir: string,
  pkg: PackageJson | null,
): Promise<{
  framework: Framework;
  confidence: "high" | "medium" | "low";
  nextJs?: NextJsDetails;
  astro?: AstroDetails;
  remix?: RemixDetails;
  hono?: HonoDetails;
}> {
  const deps = pkg ? getDependencyNames(pkg) : new Set<string>();

  const hasAppDir = await fileExists(path.join(rootDir, "app"));
  const hasPagesDir = await fileExists(path.join(rootDir, "pages"));
  const nextConfigs = await projectGlob(["next.config.{js,mjs,ts}"], { cwd: rootDir });
  const astroConfigs = await projectGlob(["astro.config.{mjs,js,ts,cjs}"], { cwd: rootDir });

  const isRemixDep =
    deps.has("@remix-run/react") ||
    deps.has("@remix-run/node") ||
    deps.has("@remix-run/cloudflare") ||
    deps.has("@remix-run/dev") ||
    deps.has("@remix-run/cloudflare-pages") ||
    deps.has("@remix-run/cloudflare-workers");
  const isAstroDep = deps.has("astro") || astroConfigs.length > 0;

  // Prefer explicit Next signals; do not treat bare app/ as Next when Remix/Astro is present.
  if (
    deps.has("next") ||
    nextConfigs.length > 0 ||
    ((hasAppDir || hasPagesDir) && !isRemixDep && !isAstroDep && !deps.has("hono"))
  ) {
    const middlewareExists =
      (await fileExists(path.join(rootDir, "middleware.ts"))) ||
      (await fileExists(path.join(rootDir, "middleware.js")));
    const apiRoutes = await detectApiRoutes(rootDir, "nextjs");
    let router: NextJsDetails["router"] = "unknown";
    if (hasAppDir) router = "app";
    else if (hasPagesDir) router = "pages";

    return {
      framework: "nextjs",
      confidence: deps.has("next") || nextConfigs.length > 0 ? "high" : "medium",
      nextJs: {
        router,
        hasMiddleware: middlewareExists,
        hasApiRoutes: apiRoutes.length > 0,
        configFiles: nextConfigs,
      },
    };
  }

  if (isAstroDep) {
    return {
      framework: "astro",
      confidence: deps.has("astro") ? "high" : "medium",
      astro: await inspectAstro(rootDir, deps, astroConfigs),
    };
  }

  const remixConfigs = await projectGlob(
    ["remix.config.{js,cjs,mjs,ts}", "vite.config.{ts,js,mjs}"],
    { cwd: rootDir },
  );
  if (isRemixDep) {
    return {
      framework: "remix",
      confidence: "high",
      remix: await inspectRemix(rootDir, deps, remixConfigs),
    };
  }

  if (deps.has("nuxt") || deps.has("nuxt3")) {
    return { framework: "nuxt", confidence: "high" };
  }

  if (deps.has("hono")) {
    return {
      framework: "hono",
      confidence: "high",
      hono: await inspectHono(rootDir, deps),
    };
  }

  const viteConfigs = await projectGlob(["vite.config.{ts,js,mjs}"], { cwd: rootDir });
  if (deps.has("vite") || viteConfigs.length > 0) {
    return { framework: "vite", confidence: deps.has("vite") ? "high" : "medium" };
  }

  if (deps.has("express")) {
    return { framework: "express", confidence: "high" };
  }

  if (deps.has("react") && (deps.has("react-scripts") || deps.has("react-dom"))) {
    return { framework: "react-spa", confidence: "medium" };
  }

  if (pkg && (deps.has("typescript") || deps.has("@types/node"))) {
    const hasServerEntry = await projectGlob(["src/index.{ts,js}", "index.{ts,js}"], {
      cwd: rootDir,
    });
    if (hasServerEntry.length > 0) {
      const content = await readTextFile(path.join(rootDir, hasServerEntry[0]!));
      if (content?.includes("createServer") || content?.includes("http.createServer")) {
        return { framework: "nodejs", confidence: "medium" };
      }
    }
    return { framework: "nodejs", confidence: "low" };
  }

  const htmlFiles = await projectGlob(["**/*.html", "public/**/*.html"], {
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

async function inspectAstro(
  rootDir: string,
  deps: Set<string>,
  configFiles: string[],
): Promise<AstroDetails> {
  let outputMode: AstroDetails["outputMode"] = "unknown";
  for (const file of configFiles) {
    const content = await readTextFile(path.join(rootDir, file));
    if (!content) continue;
    if (/output\s*:\s*['"]static['"]/.test(content)) outputMode = "static";
    else if (/output\s*:\s*['"]server['"]/.test(content)) outputMode = "server";
    else if (/output\s*:\s*['"]hybrid['"]/.test(content)) outputMode = "hybrid";
  }
  if (outputMode === "unknown" && configFiles.length === 0 && !deps.has("@astrojs/cloudflare")) {
    outputMode = "static";
  }

  return {
    configFiles,
    hasCloudflareAdapter:
      deps.has("@astrojs/cloudflare") ||
      (await configMentions(rootDir, configFiles, "@astrojs/cloudflare")),
    outputMode,
  };
}

async function inspectRemix(
  rootDir: string,
  deps: Set<string>,
  configFiles: string[],
): Promise<RemixDetails> {
  const remixConfigFiles = configFiles.filter((f) => f.startsWith("remix.config"));
  const viteConfigFiles = configFiles.filter((f) => f.startsWith("vite.config"));
  return {
    configFiles: [...remixConfigFiles, ...viteConfigFiles],
    hasCloudflareAdapter:
      deps.has("@remix-run/cloudflare") ||
      deps.has("@remix-run/cloudflare-pages") ||
      deps.has("@remix-run/cloudflare-workers") ||
      (await configMentions(rootDir, configFiles, "cloudflare")),
    usesVite: deps.has("vite") || viteConfigFiles.length > 0,
  };
}

async function inspectHono(rootDir: string, deps: Set<string>): Promise<HonoDetails> {
  const entryCandidates = await projectGlob(
    [
      "src/index.{ts,js}",
      "src/app.{ts,js}",
      "src/worker.{ts,js}",
      "index.{ts,js}",
      "worker.{ts,js}",
      "src/**/index.{ts,js}",
    ],
    { cwd: rootDir, ignore: ["node_modules/**", "dist/**"] },
  );

  const entryFiles: string[] = [];
  let hasWorkersAdapterHint = false;
  for (const file of entryCandidates.slice(0, 20)) {
    const content = await readTextFile(path.join(rootDir, file));
    if (!content) continue;
    if (!/\bfrom\s+['"]hono['"]|\brequire\s*\(\s*['"]hono['"]/.test(content)) continue;
    entryFiles.push(file);
    if (
      /export\s+default/.test(content) ||
      /cloudflare/i.test(content) ||
      /\.fetch\b/.test(content)
    ) {
      hasWorkersAdapterHint = true;
    }
  }

  return {
    entryFiles,
    hasNodeServer: deps.has("@hono/node-server"),
    hasWorkersAdapterHint: hasWorkersAdapterHint || deps.has("wrangler"),
  };
}

async function configMentions(
  rootDir: string,
  configFiles: string[],
  needle: string,
): Promise<boolean> {
  for (const file of configFiles) {
    const content = await readTextFile(path.join(rootDir, file));
    if (content?.includes(needle)) return true;
  }
  return false;
}

export async function detectApiRoutes(
  rootDir: string,
  framework: Framework,
): Promise<string[]> {
  const routes: string[] = [];

  if (framework === "nextjs") {
    const appRoutes = await projectGlob(["app/**/route.{ts,js}", "pages/api/**/*.{ts,js}"], {
      cwd: rootDir,
      onlyFiles: true,
    });
    for (const file of appRoutes) {
      if (file.startsWith("app/")) {
        const route =
          file
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

  if (framework === "express" || framework === "nodejs" || framework === "hono") {
    const serverFiles = await projectGlob(["**/*.{ts,js}"], {
      cwd: rootDir,
      ignore: ["node_modules/**", "dist/**"],
    });
    for (const file of serverFiles.slice(0, 100)) {
      const content = await readTextFile(path.join(rootDir, file));
      if (!content) continue;
      const matches = content.matchAll(
        /\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      );
      for (const m of matches) {
        routes.push(m[2]!);
      }
    }
  }

  if (framework === "remix") {
    const routeFiles = await projectGlob(
      ["app/routes/**/*.{ts,tsx,js,jsx}", "routes/**/*.{ts,tsx,js,jsx}"],
      { cwd: rootDir, ignore: ["node_modules/**"] },
    );
    for (const file of routeFiles) {
      const base = file
        .replace(/^(app\/)?routes\//, "")
        .replace(/\.(ts|tsx|js|jsx)$/, "")
        .replace(/\./g, "/");
      if (base.includes("api") || /(_|\+)/.test(path.basename(file))) {
        routes.push("/" + base.replace(/^_/, "").replace(/\+/g, ""));
      }
    }
  }

  return [...new Set(routes)].sort();
}

export async function detectPageRoutes(rootDir: string, framework: Framework): Promise<string[]> {
  const routes: string[] = ["/"];

  if (framework === "nextjs") {
    const pageFiles = await projectGlob(
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

  if (framework === "astro") {
    const pageFiles = await projectGlob(["src/pages/**/*.{astro,md,mdx,html}"], {
      cwd: rootDir,
      ignore: ["**/node_modules/**"],
    });
    for (const file of pageFiles) {
      const route =
        "/" +
        file
          .replace(/^src\/pages\//, "")
          .replace(/\.(astro|md|mdx|html)$/, "")
          .replace(/\/index$/, "");
      routes.push(route === "/" || route === "" ? "/" : route);
    }
  }

  if (framework === "remix") {
    const routeFiles = await projectGlob(
      ["app/routes/**/*.{ts,tsx,js,jsx}", "app/routes/**/*.mdx"],
      { cwd: rootDir, ignore: ["**/node_modules/**"] },
    );
    for (const file of routeFiles) {
      const base = file
        .replace(/^app\/routes\//, "")
        .replace(/\.(ts|tsx|js|jsx|mdx)$/, "")
        .replace(/\./g, "/")
        .replace(/\$/g, ":")
        .replace(/_index$/, "")
        .replace(/\/index$/, "");
      routes.push(base ? `/${base}` : "/");
    }
  }

  if (framework === "vite" || framework === "react-spa" || framework === "static") {
    const htmlFiles = await projectGlob(["index.html", "public/**/*.html"], { cwd: rootDir });
    for (const file of htmlFiles) {
      if (file === "index.html") routes.push("/");
      else {
        const route =
          "/" +
          file.replace(/^public\//, "").replace(/index\.html$/, "").replace(/\.html$/, "");
        routes.push(route.replace(/\/$/, "") || "/");
      }
    }
  }

  return [...new Set(routes)].sort();
}

export async function detectAuthPatterns(rootDir: string): Promise<boolean> {
  const files = await projectGlob(["**/*.{ts,tsx,js,jsx}"], {
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
