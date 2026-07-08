#!/usr/bin/env node
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const png = path.join(root, "docs/assets/og.png");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0F172A"/>
  <rect x="60" y="60" width="80" height="80" rx="16" fill="#F97316"/>
  <text x="100" y="115" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" font-weight="800" fill="#111">CF</text>
  <text x="160" y="120" font-family="system-ui,sans-serif" font-size="44" font-weight="800" fill="#F8FAFC">Cloudflare Go-Live Readiness</text>
  <text x="160" y="175" font-family="system-ui,sans-serif" font-size="28" fill="#94A3B8">Know before you deploy.</text>
  <rect x="160" y="220" width="480" height="52" rx="10" fill="#152238" stroke="#F97316" stroke-width="2"/>
  <text x="180" y="254" font-family="ui-monospace,monospace" font-size="18" fill="#FDBA74">npx @orangecloud/cf-ready scan</text>
</svg>`;

await sharp(Buffer.from(svg)).resize(1200, 630).png().toFile(png);
console.log(`Wrote ${png}`);
