import type { AiOptimizeRequest, AiOptimizeResponse, Env } from "./types.js";
import { buildOptimizePrompt, extractJsonFromModelResponse } from "./prompt.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function unauthorized(): Response {
  return jsonResponse({ error: "Unauthorized" }, 401);
}

function checkAuth(request: Request, env: Env): boolean {
  if (!env.AI_API_KEY) return true;
  const auth = request.headers.get("Authorization");
  return auth === `Bearer ${env.AI_API_KEY}`;
}

async function runModel(
  env: Env,
  model: string,
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const gateway = { id: env.AI_GATEWAY_ID || "default", skipCache: false };
  const response = await env.AI.run(
    model,
    { messages },
    { gateway },
  );

  if (typeof response === "string") return response;
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>;
    if (typeof r.response === "string") return r.response;
    if (Array.isArray(r.choices)) {
      const choice = r.choices[0] as { message?: { content?: string } };
      if (choice?.message?.content) return choice.message.content;
    }
    if (typeof r.result === "string") return r.result;
  }
  return JSON.stringify(response);
}

function toMarkdown(
  model: string,
  parsed: { summary?: string; suggestions?: AiOptimizeResponse["suggestions"] },
): string {
  const lines = [
    "# cf-ready AI Optimization Report",
    "",
    `**Model:** ${model}`,
    "",
    "## Summary",
    "",
    parsed.summary ?? "No summary returned.",
    "",
    "## Suggestions",
    "",
  ];

  for (const s of parsed.suggestions ?? []) {
    lines.push(`### [${s.priority?.toUpperCase() ?? "MEDIUM"}] ${s.title}`, "");
    if (s.findingId) lines.push(`**Finding:** ${s.findingId}`, "");
    if (s.cloudflarePattern) lines.push(`**Cloudflare pattern:** ${s.cloudflarePattern}`, "");
    if (s.estimatedEffort) lines.push(`**Effort:** ${s.estimatedEffort}`, "");
    lines.push("**Steps:**");
    for (const step of s.refactorSteps ?? []) {
      lines.push(`- ${step}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function handleOptimize(request: Request, env: Env): Promise<Response> {
  if (!checkAuth(request, env)) return unauthorized();

  let body: AiOptimizeRequest;
  try {
    body = (await request.json()) as AiOptimizeRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.findings?.length) {
    return jsonResponse({ error: "findings array is required" }, 400);
  }

  const primaryModel = body.model ?? env.DEFAULT_AI_MODEL ?? "openai/gpt-4o-mini";
  const fallbackModel = env.FALLBACK_AI_MODEL ?? "@cf/meta/llama-3.1-8b-instruct-fast";
  const prompt = buildOptimizePrompt(body);

  const messages = [
    {
      role: "system",
      content:
        "You are cf-ready AI assistant for Cloudflare migration and refactoring. Output JSON only.",
    },
    { role: "user", content: prompt },
  ];

  let raw = "";
  let modelUsed = primaryModel;

  try {
    raw = await runModel(env, primaryModel, messages);
  } catch (primaryError) {
    try {
      raw = await runModel(env, fallbackModel, [
        { role: "user", content: prompt },
      ]);
      modelUsed = fallbackModel;
    } catch {
      return jsonResponse(
        {
          error: "AI inference failed",
          details:
            primaryError instanceof Error ? primaryError.message : String(primaryError),
          hint: "Enable Cloudflare AI Gateway Unified Billing for openai/* models, or check Workers AI credits.",
        },
        502,
      );
    }
  }

  let parsed: { summary?: string; suggestions?: AiOptimizeResponse["suggestions"] } = {};
  try {
    parsed = JSON.parse(extractJsonFromModelResponse(raw)) as typeof parsed;
  } catch {
    parsed = {
      summary: raw.slice(0, 500),
      suggestions: [
        {
          title: "Review raw AI output",
          priority: "medium",
          refactorSteps: [raw.slice(0, 1000)],
        },
      ],
    };
  }

  const result: AiOptimizeResponse = {
    model: modelUsed,
    summary: parsed.summary ?? "",
    suggestions: parsed.suggestions ?? [],
    markdown: toMarkdown(modelUsed, parsed),
  };

  return jsonResponse(result);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === "/api/health") {
      return jsonResponse({ ok: true, service: "cf-ready-ai" });
    }

    if (url.pathname === "/api/optimize" && request.method === "POST") {
      return handleOptimize(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
