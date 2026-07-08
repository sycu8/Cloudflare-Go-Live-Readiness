export type AiOptimizeRequest = {
  framework: string;
  deploymentTarget: string;
  focus?: "migration" | "security" | "all";
  model?: string;
  findings: Array<{
    id: string;
    category: string;
    severity: string;
    title: string;
    description: string;
    recommendation: string;
    affectedFiles?: string[];
  }>;
  fileSnippets: Array<{ path: string; content: string }>;
};

export type AiOptimizeResponse = {
  model: string;
  summary: string;
  suggestions: Array<{
    findingId?: string;
    title: string;
    priority: "blocker" | "high" | "medium" | "low";
    refactorSteps: string[];
    cloudflarePattern?: string;
    estimatedEffort?: string;
  }>;
  markdown: string;
};

export type SessionStatus = "idle" | "importing" | "running" | "done" | "error";

export type GitHubRepoRef = {
  owner: string;
  repo: string;
  ref: string;
};

export type ReportCacheMeta = {
  contentHash: string;
  r2Key: string;
  generatedAt: string;
  commitSha?: string;
  format: "pdf";
};

export type SessionState = {
  id: string;
  status: SessionStatus;
  projectName?: string;
  source?: "upload" | "github";
  githubRepo?: GitHubRepoRef;
  sourceCommitSha?: string;
  reportCache?: ReportCacheMeta;
  lastCommand?: string;
  lastError?: string;
  lastResult?: unknown;
  lastMarkdown?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExecRequest = {
  command: string;
  args?: string[];
  flags?: Record<string, string | boolean>;
};

export type GitHubImportRequest = {
  repoUrl: string;
  ref?: string;
};

export type ChatRequest = {
  message: string;
};

export type Env = {
  AI: {
    run(
      model: string,
      input: Record<string, unknown>,
      options?: { gateway?: { id: string; skipCache?: boolean } },
    ): Promise<Record<string, unknown>>;
  };
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  SESSION: DurableObjectNamespace;
  Sandbox: DurableObjectNamespace;
  UPLOADS?: R2Bucket;
  SESSIONS?: KVNamespace;
  DB?: D1Database;
  DEFAULT_AI_MODEL: string;
  FALLBACK_AI_MODEL: string;
  AI_GATEWAY_ID: string;
  AI_API_KEY?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_REDIRECT_URI?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  WORKER_PUBLIC_URL?: string;
};
