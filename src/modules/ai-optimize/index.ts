import path from "node:path";
import { readTextFile } from "../../core/filesystem.js";
import type { CfReadyConfig, Finding } from "../../config/schema.js";
import type { ScanContext } from "../../core/context.js";

export type FileSnippet = { path: string; content: string };

const MAX_TOTAL_CHARS = 12000;
const MAX_FILE_CHARS = 2500;

export async function collectFileSnippets(
  rootDir: string,
  findings: Finding[],
): Promise<FileSnippet[]> {
  const files = new Set<string>();
  for (const f of findings) {
    for (const file of f.affectedFiles ?? []) {
      if (!file.includes("node_modules")) files.add(file);
    }
  }

  const snippets: FileSnippet[] = [];
  let total = 0;

  for (const rel of [...files].slice(0, 10)) {
    const full = path.join(rootDir, rel);
    const content = await readTextFile(full);
    if (!content) continue;
    const slice = content.slice(0, MAX_FILE_CHARS);
    if (total + slice.length > MAX_TOTAL_CHARS) break;
    snippets.push({ path: rel, content: slice });
    total += slice.length;
  }

  return snippets;
}

export function getAiWorkerUrl(config: CfReadyConfig): string {
  return (
    config.ai?.workerUrl ??
    process.env.CF_READY_AI_WORKER_URL ??
    "https://cf-ready-docs.sycu-lee.workers.dev"
  );
}

export function getAiModel(config: CfReadyConfig): string {
  return config.ai?.model ?? "openai/gpt-4o-mini";
}

export async function callAiOptimizeApi(
  workerUrl: string,
  payload: Record<string, unknown>,
  apiKey?: string,
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(new URL("/api/optimize", workerUrl).toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : `AI worker returned ${response.status}`,
    );
  }
  return data;
}

export async function buildOptimizePayload(
  context: ScanContext,
  focus: "migration" | "security" | "all",
): Promise<Record<string, unknown>> {
  const openFindings = context.findings.filter(
    (f) => f.status === "open" && f.severity !== "passed" && f.severity !== "info",
  );

  const filtered =
    focus === "all"
      ? openFindings
      : openFindings.filter((f) => f.category === focus || (focus === "migration" && f.category === "migration"));

  const fileSnippets = await collectFileSnippets(context.rootDir, filtered);

  return {
    framework: context.inspection.framework,
    deploymentTarget: context.inspection.deploymentTarget,
    focus,
    model: getAiModel(context.config),
    findings: filtered.slice(0, 20).map((f) => ({
      id: f.id,
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description,
      recommendation: f.recommendation,
      affectedFiles: f.affectedFiles,
    })),
    fileSnippets,
  };
}
