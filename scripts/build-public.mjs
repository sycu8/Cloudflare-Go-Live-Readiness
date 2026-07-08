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
    else if (name.endsWith(".html")) injectThemeScript(full);
  }
}

function injectThemeScript(filePath) {
  let html = readFileSync(filePath, "utf8");
  if (html.includes("/assets/theme.js")) return;
  const tag = '    <script src="/assets/theme.js"></script>\n';
  if (html.includes("<head>")) {
    html = html.replace("<head>", `<head>\n${tag}`);
  } else {
    return;
  }
  writeFileSync(filePath, html);
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
  if (existsSync(appIndex)) injectThemeScript(appIndex);
}

console.log("Built public/ (docs + web/app)");
