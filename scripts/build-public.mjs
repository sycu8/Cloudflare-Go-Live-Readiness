#!/usr/bin/env node
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

rmSync(publicDir, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });

cpSync(path.join(root, "docs"), publicDir, { recursive: true });

// Inject theme script into all HTML pages (prevents flash, adds toggle)
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";

function walkHtml(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walkHtml(full);
    else if (name.endsWith(".html")) injectScripts(full);
  }
}

function injectScripts(filePath) {
  let html = readFileSync(filePath, "utf8");
  let changed = false;
  if (!html.includes("/assets/theme.js") && html.includes("<head>")) {
    html = html.replace("<head>", `<head>\n    <script src="/assets/theme.js"></script>\n`);
    changed = true;
  }
  if (!html.includes("/assets/site-mobile.js") && html.includes("</body>")) {
    html = html.replace("</body>", '    <script src="/assets/site-mobile.js" defer></script>\n  </body>');
    changed = true;
  }
  if (changed) writeFileSync(filePath, html);
}

walkHtml(publicDir);

// SEO public files from brandkit
const seoDir = path.join(root, "cf-ready-brandkit", "seo");
for (const file of ["robots.txt", "llms.txt", "sitemap.xml"]) {
  const src = path.join(seoDir, file);
  if (existsSync(src)) {
    cpSync(src, path.join(publicDir, file));
  }
}

const webDir = path.join(root, "web");
if (existsSync(path.join(webDir, "package.json"))) {
  execSync("npm install", { cwd: webDir, stdio: "inherit" });
  execSync("npm run build", { cwd: webDir, stdio: "inherit" });
  const appIndex = path.join(publicDir, "app", "index.html");
  if (existsSync(appIndex)) injectScripts(appIndex);
}

console.log("Built public/ (docs + web/app)");
