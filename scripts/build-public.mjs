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
}

console.log("Built public/ (docs + web/app)");
