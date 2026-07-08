import { z } from "zod";

export const FindingCategorySchema = z.enum([
  "migration",
  "security",
  "ai-readiness",
  "seo",
  "deployment",
  "observability",
]);

export const FindingSeveritySchema = z.enum([
  "blocker",
  "high",
  "medium",
  "low",
  "info",
  "passed",
]);

export const FindingStatusSchema = z.enum([
  "open",
  "fixed",
  "accepted-risk",
  "ignored",
]);

export const FindingSchema = z.object({
  id: z.string(),
  category: FindingCategorySchema,
  severity: FindingSeveritySchema,
  title: z.string(),
  description: z.string(),
  evidence: z.string().optional(),
  affectedFiles: z.array(z.string()).optional(),
  recommendation: z.string(),
  autoFixAvailable: z.boolean(),
  requiresApproval: z.boolean(),
  status: FindingStatusSchema,
});

export type FindingCategory = z.infer<typeof FindingCategorySchema>;
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;
export type FindingStatus = z.infer<typeof FindingStatusSchema>;
export type Finding = z.infer<typeof FindingSchema>;

export const FrameworkSchema = z.enum([
  "nextjs",
  "vite",
  "react-spa",
  "astro",
  "remix",
  "nuxt",
  "express",
  "nodejs",
  "static",
  "unknown",
]);

export const PackageManagerSchema = z.enum(["npm", "pnpm", "yarn", "bun"]);

export const DeploymentTargetSchema = z.enum([
  "vercel",
  "netlify",
  "docker-vps",
  "cloudflare-pages",
  "cloudflare-workers",
  "unknown",
]);

export const CfReadyConfigSchema = z.object({
  projectName: z.string().optional(),
  productionUrl: z.string().url().optional(),
  target: DeploymentTargetSchema.optional(),
  framework: FrameworkSchema.optional(),
  outputDir: z.string().default("."),
  aiPolicy: z
    .enum(["allow-assistive-agents", "restrict", "block"])
    .default("allow-assistive-agents"),
  migration: z
    .object({
      preferredPath: z.string().optional(),
      fallbackPath: z.string().optional(),
      allowAutoMigration: z.boolean().default(false),
    })
    .optional(),
  seo: z
    .object({
      defaultTitle: z.string().optional(),
      defaultDescription: z.string().optional(),
      defaultImage: z.string().optional(),
      organizationName: z.string().optional(),
    })
    .optional(),
  criticalRoutes: z.array(z.string()).default(["/"]),
  security: z
    .object({
      blockOnSecrets: z.boolean().default(true),
      blockOnCriticalDependencies: z.boolean().default(true),
    })
    .optional(),
  ai: z
    .object({
      workerUrl: z.string().url().optional(),
      model: z.string().default("openai/gpt-4o-mini"),
      apiToken: z.string().optional(),
      gatewayId: z.string().default("default"),
    })
    .optional(),
});

export type CfReadyConfig = z.infer<typeof CfReadyConfigSchema>;
export type Framework = z.infer<typeof FrameworkSchema>;
export type PackageManager = z.infer<typeof PackageManagerSchema>;
export type DeploymentTarget = z.infer<typeof DeploymentTargetSchema>;

export const DEFAULT_CONFIG: CfReadyConfig = {
  outputDir: ".",
  aiPolicy: "allow-assistive-agents",
  criticalRoutes: ["/"],
  security: {
    blockOnSecrets: true,
    blockOnCriticalDependencies: true,
  },
};
