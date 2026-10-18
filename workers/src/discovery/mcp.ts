import { PRODUCT_VERSION, mcpServerCard, originOf } from "./documents.js";

type JsonRpc = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const DOC_PAGES = [
  {
    title: "Getting started",
    url: "/docs/getting-started.html",
    summary: "Install the CLI and run the first Cloudflare go-live scan.",
  },
  {
    title: "Commands",
    url: "/docs/commands.html",
    summary: "scan, security-scan, ai-ready, seo-ready, deploy-check, and fix.",
  },
  {
    title: "AI readiness",
    url: "/docs/ai-readiness.html",
    summary: "robots.txt, llms.txt, OpenAPI, MCP server cards, and auth.md.",
  },
  {
    title: "Security readiness",
    url: "/docs/security-readiness.html",
    summary: "Headers, secrets, dependencies, and CORS checks.",
  },
  {
    title: "SEO readiness",
    url: "/docs/seo-readiness.html",
    summary: "Metadata, canonical URLs, sitemap, and crawlability.",
  },
  {
    title: "Web Agent",
    url: "/docs/web-agent.html",
    summary: "Run scans in the browser by uploading a ZIP or importing GitHub.",
  },
];

function toolResult(id: JsonRpc["id"], text: string, isError = false) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result: {
      content: [{ type: "text", text }],
      isError,
    },
  };
}

function searchDocs(query: string, origin: string): string {
  const needle = query.trim().toLowerCase();
  const ranked = DOC_PAGES.map((page) => {
    const title = page.title.toLowerCase();
    const summary = page.summary.toLowerCase();
    const score = !needle ? 1 : title.includes(needle) ? 3 : summary.includes(needle) ? 1 : 0;
    return { page, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  const pages = ranked.length > 0 ? ranked.map((entry) => entry.page) : DOC_PAGES;
  return pages
    .map((page) => `- ${page.title}: ${origin}${page.url} — ${page.summary}`)
    .join("\n");
}

function callTool(name: string, args: Record<string, unknown>, origin: string, id: JsonRpc["id"]) {
  if (name === "cf_ready_health") {
    return toolResult(id, "CF Ready is serving discovery documents and the public health endpoint at /api/health.");
  }
  if (name === "install_command") {
    return toolResult(id, "npx @orangecloud/cf-ready scan");
  }
  if (name === "search_docs") {
    const query = typeof args.query === "string" ? args.query : "";
    return toolResult(id, searchDocs(query, origin));
  }
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code: -32601, message: `Unknown tool: ${name}` },
  };
}

function rpcResult(message: JsonRpc, origin: string): unknown | null {
  const { id, method, params } = message;
  if (!method) {
    return { jsonrpc: "2.0", id: id ?? null, error: { code: -32600, message: "Invalid Request" } };
  }
  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return null;
  }
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: {
          tools: { listChanged: false },
          resources: { listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: { name: "cf-ready", version: PRODUCT_VERSION },
      },
    };
  }
  if (method === "ping") {
    return { jsonrpc: "2.0", id: id ?? null, result: {} };
  }
  if (method === "tools/list") {
    const card = mcpServerCard(origin);
    const tools = (card.tools as Array<{ name: string; description: string }>).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema:
        tool.name === "search_docs"
          ? {
              type: "object",
              properties: {
                query: { type: "string", description: "Words to match against CF Ready docs." },
              },
              required: ["query"],
              additionalProperties: false,
            }
          : { type: "object", properties: {}, additionalProperties: false },
    }));
    return { jsonrpc: "2.0", id: id ?? null, result: { tools } };
  }
  if (method === "tools/call") {
    const name = typeof params?.name === "string" ? params.name : "";
    const args =
      params?.arguments && typeof params.arguments === "object"
        ? (params.arguments as Record<string, unknown>)
        : {};
    return callTool(name, args, origin, id);
  }
  if (method === "resources/list") {
    return { jsonrpc: "2.0", id: id ?? null, result: { resources: [] } };
  }
  if (method === "prompts/list") {
    return { jsonrpc: "2.0", id: id ?? null, result: { prompts: [] } };
  }
  return { jsonrpc: "2.0", id: id ?? null, error: { code: -32601, message: `Method not found: ${method}` } };
}

export async function handleMcp(request: Request): Promise<Response> {
  const origin = originOf(request);
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Mcp-Session-Id",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (request.method === "GET" || request.method === "HEAD") {
    return new Response(JSON.stringify(mcpServerCard(origin)), { status: 200, headers });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, Allow: "GET, POST, OPTIONS" },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }),
      { status: 400, headers },
    );
  }

  if (Array.isArray(body)) {
    const results = body
      .map((entry) => rpcResult(entry as JsonRpc, origin))
      .filter((entry) => entry !== null);
    if (results.length === 0) return new Response(null, { status: 202, headers });
    return new Response(JSON.stringify(results), { status: 200, headers });
  }

  const result = rpcResult(body as JsonRpc, origin);
  if (result === null) return new Response(null, { status: 202, headers });
  return new Response(JSON.stringify(result), { status: 200, headers });
}
