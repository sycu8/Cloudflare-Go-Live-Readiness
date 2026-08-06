import type { Framework } from "./schema.js";

export type Remediation = {
  steps: string[];
  docsUrl?: string;
  cfReadyCommand?: string;
  wranglerSnippet?: string;
  estimatedEffort?: "minutes" | "hours" | "days";
};

const CF_DOCS = "https://developers.cloudflare.com";

const RUNTIME_REMEDIATIONS: Record<string, Remediation> = {
  fs: {
    steps: [
      "Replace filesystem reads/writes with R2 bindings or fetch() to static assets.",
      "Use Workers KV for small configuration blobs instead of local files.",
    ],
    docsUrl: `${CF_DOCS}/r2/`,
    estimatedEffort: "hours",
  },
  "child-process": {
    steps: [
      "Remove shell/process spawning; use fetch(), Queues, or Durable Objects for background work.",
    ],
    docsUrl: `${CF_DOCS}/workers/runtime-apis/fetch/`,
    estimatedEffort: "days",
  },
  "native-module": {
    steps: [
      "Remove .node native addons; use Web APIs or WASM builds compiled for Workers.",
    ],
    estimatedEffort: "days",
  },
  "process-env": {
    steps: [
      "Declare secrets in wrangler.toml [vars] or Cloudflare dashboard.",
      "Use env bindings passed to the Worker export default handler.",
    ],
    wranglerSnippet: '[vars]\n# MY_VAR = "value"  # use secrets for sensitive values',
    estimatedEffort: "minutes",
  },
};

const FRAMEWORK_MIGRATION: Partial<Record<Framework, Remediation>> = {
  nextjs: {
    steps: [
      "Run npx vinext check to validate Next.js compatibility on Cloudflare.",
      "Initialize vinext: npx vinext init --platform=cloudflare",
      "Deploy dry-run: npx @vinext/cloudflare deploy --dry-run",
    ],
    docsUrl: "https://github.com/cloudflare/vinext",
    estimatedEffort: "hours",
  },
  vite: {
    steps: [
      "Add @cloudflare/vite-plugin and configure wrangler.jsonc for Workers.",
      "Build with vite build and deploy via wrangler deploy.",
    ],
    docsUrl: `${CF_DOCS}/workers/vite-plugin/`,
    estimatedEffort: "hours",
  },
  astro: {
    steps: [
      "For static sites, run astro build and deploy dist/ to Cloudflare Pages.",
      "For SSR/hybrid, install @astrojs/cloudflare and set it as the Astro adapter.",
      "Add wrangler.toml and validate bindings for images, KV, or D1 if used.",
    ],
    docsUrl: "https://docs.astro.build/en/guides/integrations-guide/cloudflare/",
    estimatedEffort: "hours",
  },
  remix: {
    steps: [
      "Start from the Remix Cloudflare template or add @remix-run/cloudflare.",
      "Replace Node-only session/storage with KV, Durable Objects, or external stores.",
      "Add wrangler.toml and deploy with wrangler.",
    ],
    docsUrl: "https://remix.run/docs/en/main/guides/vite#cloudflare",
    estimatedEffort: "hours",
  },
  hono: {
    steps: [
      "Export the Hono app as a Worker fetch handler (export default app).",
      "Remove @hono/node-server for Cloudflare Workers production deploys.",
      "Add wrangler.toml with main pointing at your entry file.",
    ],
    docsUrl: "https://hono.dev/docs/getting-started/cloudflare-workers",
    wranglerSnippet: 'name = "hono-app"\nmain = "src/index.ts"\ncompatibility_date = "2024-01-01"',
    estimatedEffort: "minutes",
  },
};

export function getRemediationForRule(
  ruleId: string,
  framework: Framework = "unknown",
): Remediation | undefined {
  if (RUNTIME_REMEDIATIONS[ruleId]) return RUNTIME_REMEDIATIONS[ruleId];
  if (ruleId.startsWith("migration-") && FRAMEWORK_MIGRATION[framework]) {
    return FRAMEWORK_MIGRATION[framework];
  }
  return undefined;
}

export function getSecretRemediation(): Remediation {
  return {
    steps: [
      "Rotate the exposed credential immediately.",
      "Move secrets to wrangler secret put or Cloudflare dashboard — never commit to git.",
      "Add .env* to .gitignore if not already present.",
    ],
    docsUrl: `${CF_DOCS}/workers/configuration/secrets/`,
    estimatedEffort: "minutes",
  };
}

export function getAssetRemediation(
  asset: string,
  fixCommand: string,
): Remediation {
  return {
    steps: [`Run ${fixCommand} to generate a draft ${asset}.`, "Review and commit the generated file."],
    cfReadyCommand: fixCommand,
    estimatedEffort: "minutes",
  };
}

export function getSeoMetadataRemediation(title: string): Remediation {
  return {
    steps: [
      `Add ${title} to your layout or page metadata.`,
      "Run cf-ready fix --seo to generate cf-ready-seo-suggestions.md with copy-paste snippets.",
    ],
    cfReadyCommand: "cf-ready fix --seo",
    estimatedEffort: "minutes",
  };
}

/** Maps stable finding id prefixes to fix command categories. */
export const FINDING_FIX_MAP: Record<string, { aiReadiness?: boolean; seo?: boolean }> = {
  "ai-missing-": { aiReadiness: true },
  "ai-api-": { aiReadiness: true },
  "ai-mcp-": { aiReadiness: true },
  "ai-auth-": { aiReadiness: true },
  "seo-missing-": { seo: true },
};

export function resolveFixFlagsForFinding(findingId: string): {
  aiReadiness: boolean;
  seo: boolean;
} {
  for (const [prefix, flags] of Object.entries(FINDING_FIX_MAP)) {
    if (findingId.startsWith(prefix)) {
      return { aiReadiness: Boolean(flags.aiReadiness), seo: Boolean(flags.seo) };
    }
  }
  return { aiReadiness: false, seo: false };
}
