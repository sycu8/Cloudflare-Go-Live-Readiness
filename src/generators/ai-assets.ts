import path from "node:path";
import type { ScanContext } from "../core/context.js";
import { writeTextFile } from "../core/filesystem.js";
import { joinUrl } from "../utils/path.js";

export type FixResult = {
  file: string;
  status: "created" | "skipped" | "overwritten";
};

export async function generateAiAssets(
  context: ScanContext,
  options?: { force?: boolean },
): Promise<FixResult[]> {
  const results: FixResult[] = [];
  const projectName = context.config.projectName ?? context.inspection.projectName;
  const productionUrl = context.config.productionUrl ?? "https://example.com";
  const routes = [
    ...new Set([...context.inspection.routes, ...(context.config.criticalRoutes ?? [])]),
  ].slice(0, 20);

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${joinUrl(productionUrl, "/sitemap.xml")}

# AI crawlers (optional — adjust per your aiPolicy)
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /
`;

  const llmsTxt = `# ${projectName}

## Summary
This website/application provides ${context.config.seo?.defaultDescription ?? "services and information for users and customers"}.

## Key Pages
${routes.map((r) => `- ${r}`).join("\n")}

## API
${context.inspection.apiRoutes.length > 0 ? `API routes detected: ${context.inspection.apiRoutes.slice(0, 10).join(", ")}\nAPI documentation: ${joinUrl(productionUrl, "/openapi.json")}` : "No API routes detected."}

## Usage Policy
AI agents may use this content to help users understand, navigate, and interact with this website.

## Contact
For support, visit ${joinUrl(productionUrl, "/contact")}.
`;

  const llmsFullTxt = `${llmsTxt}

## Additional Context
- Framework: ${context.inspection.framework}
- Production URL: ${productionUrl}
- Package manager: ${context.inspection.packageManager}
`;

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${joinUrl(productionUrl, route)}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === "/" ? "1.0" : "0.8"}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  const files: Array<{ rel: string; content: string }> = [
    { rel: "public/robots.txt", content: robotsTxt },
    { rel: "public/llms.txt", content: llmsTxt },
    { rel: "public/llms-full.txt", content: llmsFullTxt },
    { rel: "public/sitemap.xml", content: sitemapXml },
  ];

  if (context.inspection.apiRoutes.length > 0) {
    const openapi = {
      openapi: "3.0.3",
      info: {
        title: projectName,
        description: `${projectName} API`,
        version: "1.0.0",
      },
      servers: [{ url: productionUrl }],
      paths: Object.fromEntries(
        context.inspection.apiRoutes.map((route) => [
          route,
          {
            get: {
              summary: `Endpoint ${route}`,
              responses: { "200": { description: "Successful response" } },
            },
          },
        ]),
      ),
    };
    files.push({ rel: "openapi.json", content: JSON.stringify(openapi, null, 2) });
  }

  if (context.inspection.apiRoutes.length > 0 || context.inspection.hasAuthPatterns) {
    const mcpCard = {
      name: projectName,
      description: `MCP server card for ${projectName}`,
      version: "1.0.0",
      endpoints: context.inspection.apiRoutes.slice(0, 10),
      authentication: context.inspection.hasAuthPatterns ? "See auth.md" : "none",
    };
    files.push({
      rel: "mcp-server-card.json",
      content: JSON.stringify(mcpCard, null, 2),
    });
  }

  if (context.inspection.hasAuthPatterns) {
    const authMd = `# Authentication

## Overview
This project uses authentication. Review and update this document before go-live.

## Detected patterns
Authentication-related code was detected in the repository.

## API authentication
- Document your auth flow (OAuth, JWT, session cookies, etc.)
- List required headers and token endpoints
- Describe refresh token behavior if applicable

## AI agent guidance
Agents should not attempt to bypass authentication. Direct users to official login flows.
`;
    files.push({ rel: "auth.md", content: authMd });
  }

  for (const { rel, content } of files) {
    const filePath = path.join(context.rootDir, rel);
    const status = await writeTextFile(filePath, content, { force: options?.force });
    results.push({ file: rel, status });
  }

  return results;
}
