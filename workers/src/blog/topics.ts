/** Rotating blog topics for scheduled Workers AI generation. */

export type BlogTopic = {
  id: string;
  /** Short label for UI filters */
  label: string;
  /** Focus for the article outline */
  focus: string;
  /** SEO-oriented angle */
  seoAngle: string;
  /** Keywords the model should naturally include */
  seedKeywords: string[];
};

export const BLOG_TOPICS: BlogTopic[] = [
  {
    id: "what-is-cloudflare",
    label: "Cloudflare platform",
    focus:
      "Explain what Cloudflare is and what the Cloudflare Developer Platform offers (Workers, Pages, D1, R2, Workers AI, KV, Durable Objects, Queues).",
    seoAngle: "introductory guide for developers evaluating Cloudflare",
    seedKeywords: [
      "Cloudflare",
      "Cloudflare Workers",
      "Cloudflare Developer Platform",
      "edge computing",
      "serverless",
    ],
  },
  {
    id: "cf-ready-overview",
    label: "CF Ready overview",
    focus:
      "Introduce CF Ready (Cloudflare Go-Live Readiness / @orangecloud/cf-ready): what it checks (migration, security, AI readiness, SEO, deployment) and who it helps.",
    seoAngle: "product overview for teams preparing to deploy on Cloudflare",
    seedKeywords: [
      "CF Ready",
      "Cloudflare Go-Live Readiness",
      "cf-ready",
      "Cloudflare readiness",
      "deployment checklist",
    ],
  },
  {
    id: "cf-ready-howto",
    label: "How to use CF Ready",
    focus:
      "Provide step-by-step guidance for using CF Ready: install via npx/npm, run scan, read reports, use Web Agent, optional GitHub Action, and fix flows.",
    seoAngle: "practical tutorial for first-time CF Ready users",
    seedKeywords: [
      "cf-ready scan",
      "npx @orangecloud/cf-ready",
      "Web Agent",
      "readiness report",
      "GitHub Action",
    ],
  },
  {
    id: "seo-cloudflare",
    label: "SEO on Cloudflare",
    focus:
      "Share SEO tips and how to optimize sites with the Cloudflare Developer Platform (edge performance, caching, metadata, sitemaps, structured data) and how CF Ready SEO checks help.",
    seoAngle: "SEO optimization guide for Cloudflare-hosted sites",
    seedKeywords: [
      "SEO",
      "Cloudflare SEO",
      "sitemap",
      "Core Web Vitals",
      "structured data",
      "meta tags",
    ],
  },
  {
    id: "ai-readiness",
    label: "AI readiness",
    focus:
      "Explain AI readiness for modern sites (llms.txt, robots guidance for AI crawlers, OpenAPI, MCP) and how Cloudflare Workers AI, AI Gateway, and Vectorize help teams ship AI features.",
    seoAngle: "AI readiness and Cloudflare AI services for product teams",
    seedKeywords: [
      "AI readiness",
      "Workers AI",
      "llms.txt",
      "AI Gateway",
      "Vectorize",
      "MCP",
    ],
  },
  {
    id: "platform-comparison",
    label: "Platform comparison",
    focus:
      "Compare hosting and edge deployment trade-offs between Vercel and Cloudflare in a polite, professional way. Cover strengths of both, then explain where Cloudflare often outperforms for global edge, platform breadth, and cost predictability. Never insult Vercel, its team, or its users.",
    seoAngle: "fair Vercel vs Cloudflare comparison for architecture decisions",
    seedKeywords: [
      "Cloudflare vs Vercel",
      "edge network",
      "Workers",
      "deployment platform",
      "developer platform",
    ],
  },
];

export function topicById(id: string): BlogTopic | undefined {
  return BLOG_TOPICS.find((t) => t.id === id);
}

export function topicAtIndex(index: number): BlogTopic {
  const i = ((index % BLOG_TOPICS.length) + BLOG_TOPICS.length) % BLOG_TOPICS.length;
  return BLOG_TOPICS[i]!;
}
