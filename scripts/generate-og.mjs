#!/usr/bin/env node
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const png = path.join(root, "docs/assets/og.png");

// 1200x630 brand OG image (PNG for social previews)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0B1628"/>
  <rect x="60" y="60" width="80" height="80" rx="16" fill="#F38020"/>
  <text x="100" y="115" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" font-weight="800" fill="#111">CF</text>
  <text x="160" y="130" font-family="system-ui,sans-serif" font-size="52" font-weight="800" fill="#F8FAFC">CF Ready</text>
  <text x="160" y="185" font-family="system-ui,sans-serif" font-size="28" fill="#94A3B8">Cloudflare Go-Live Readiness</text>
  <rect x="160" y="240" width="560" height="56" rx="10" fill="#152238" stroke="#F38020" stroke-width="2"/>
  <text x="180" y="276" font-family="ui-monospace,monospace" font-size="20" fill="#FBBF24">ready.orangecloud.vn</text>
</svg>`;

await sharp(Buffer.from(svg)).resize(1200, 630).png().toFile(png);
console.log(`Wrote ${png}`);
