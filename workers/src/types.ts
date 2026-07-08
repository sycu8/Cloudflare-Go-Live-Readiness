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

export type Env = {
  AI: {
    run(
      model: string,
      input: Record<string, unknown>,
      options?: { gateway?: { id: string; skipCache?: boolean } },
    ): Promise<Record<string, unknown>>;
  };
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  DEFAULT_AI_MODEL: string;
  FALLBACK_AI_MODEL: string;
  AI_GATEWAY_ID: string;
  AI_API_KEY?: string;
};
