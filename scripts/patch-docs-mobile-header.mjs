#!/usr/bin/env node
/**
 * Ensure docs pages include static mobile menu button and docs-sidebar id.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(root, "docs", "docs");

const MENU_BTN = `        <button type="button" class="nav-menu-btn nav-menu-btn--docs" data-docs-menu aria-controls="docs-sidebar" aria-expanded="false" aria-label="Open documentation menu">
          <span class="nav-menu-btn__bars" aria-hidden="true"><span class="nav-menu-btn__bar"></span><span class="nav-menu-btn__bar"></span><span class="nav-menu-btn__bar"></span></span>
          <span class="nav-menu-btn__label">Menu</span>
        </button>
`;

const NAV_LINKS_OLD = `<nav class="nav-links"><a href="/">Home</a><a href="/app/" class="btn btn-primary" style="padding:0.45rem 0.85rem;min-height:auto">Web Agent</a></nav>`;
const NAV_LINKS_NEW = `${MENU_BTN}        <nav class="nav-links header-actions"><a href="/">Home</a><a href="/app/" class="btn btn-primary header-cta">Web Agent</a></nav>`;

function patchFile(filePath) {
  let html = readFileSync(filePath, "utf8");
  let changed = false;

  if (!html.includes("data-docs-menu")) {
    if (html.includes(NAV_LINKS_OLD)) {
      html = html.replace(NAV_LINKS_OLD, NAV_LINKS_NEW);
      changed = true;
    }
  }

  if (!html.includes('id="docs-sidebar"')) {
    html = html.replace(
      /<nav class="docs-nav" aria-label="Docs">/,
      '<nav class="docs-nav" id="docs-sidebar" aria-label="Docs">',
    );
    changed = true;
  }

  if (changed) writeFileSync(filePath, html);
}

for (const name of readdirSync(docsDir)) {
  const full = path.join(docsDir, name);
  if (statSync(full).isFile() && name.endsWith(".html")) patchFile(full);
}

console.log("Patched docs HTML for mobile menu");
