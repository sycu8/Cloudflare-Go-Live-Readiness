export const SECRET_PATTERNS: Array<{
  id: string;
  name: string;
  pattern: RegExp;
  severity: "blocker" | "high" | "medium";
}> = [
  {
    id: "cf-api-token",
    name: "Cloudflare API token",
    pattern: /cf_[a-zA-Z0-9_-]{20,}/,
    severity: "high",
  },
  {
    id: "aws-access-key",
    name: "AWS access key",
    pattern: /AKIA[0-9A-Z]{16}/,
    severity: "high",
  },
  {
    id: "private-key",
    name: "Private key",
    pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    severity: "blocker",
  },
  {
    id: "jwt-secret",
    name: "JWT secret",
    pattern: /jwt[_-]?secret\s*[:=]\s*['"][^'"]{8,}['"]/i,
    severity: "high",
  },
  {
    id: "api-key-generic",
    name: "API key",
    pattern: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_-]{16,}['"]/i,
    severity: "high",
  },
  {
    id: "stripe-secret",
    name: "Stripe secret key",
    pattern: /sk_live_[a-zA-Z0-9]{20,}/,
    severity: "blocker",
  },
  {
    id: "database-url",
    name: "Database URL",
    pattern: /(postgres|mysql|mongodb)(\+srv)?:\/\/[^\s'"]+:[^\s'"]+@/i,
    severity: "high",
  },
  {
    id: "github-token",
    name: "GitHub token",
    pattern: /ghp_[a-zA-Z0-9]{20,}/,
    severity: "high",
  },
];

export const RUNTIME_BLOCKER_PATTERNS: Array<{
  id: string;
  module: string;
  patterns: RegExp[];
  severity: "blocker" | "high" | "medium" | "info";
}> = [
  {
    id: "fs",
    module: "fs",
    patterns: [
      /from\s+['"]node:fs['"]/,
      /from\s+['"]fs['"]/,
      /require\s*\(\s*['"]node:fs['"]\s*\)/,
      /require\s*\(\s*['"]fs['"]\s*\)/,
      /\bfs\.(readFile|writeFile|appendFile|mkdir|rm|unlink|createReadStream|createWriteStream)/,
    ],
    severity: "blocker",
  },
  {
    id: "child_process",
    module: "child_process",
    patterns: [
      /from\s+['"]node:child_process['"]/,
      /from\s+['"]child_process['"]/,
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /\bexec(Sync)?\s*\(/,
      /\bspawn(Sync)?\s*\(/,
    ],
    severity: "blocker",
  },
  {
    id: "net",
    module: "net",
    patterns: [
      /from\s+['"]node:net['"]/,
      /from\s+['"]net['"]/,
      /require\s*\(\s*['"]net['"]\s*\)/,
    ],
    severity: "blocker",
  },
  {
    id: "tls",
    module: "tls",
    patterns: [
      /from\s+['"]node:tls['"]/,
      /from\s+['"]tls['"]/,
      /require\s*\(\s*['"]tls['"]\s*\)/,
    ],
    severity: "blocker",
  },
  {
    id: "cluster",
    module: "cluster",
    patterns: [
      /from\s+['"]node:cluster['"]/,
      /from\s+['"]cluster['"]/,
      /require\s*\(\s*['"]cluster['"]\s*\)/,
    ],
    severity: "blocker",
  },
  {
    id: "worker_threads",
    module: "worker_threads",
    patterns: [
      /from\s+['"]node:worker_threads['"]/,
      /from\s+['"]worker_threads['"]/,
      /require\s*\(\s*['"]worker_threads['"]\s*\)/,
    ],
    severity: "blocker",
  },
  {
    id: "process-env",
    module: "process.env",
    patterns: [/process\.env\.[A-Z0-9_]+/],
    severity: "info",
  },
];

export const SCAN_EXCLUDE_DIRS = [
  "node_modules",
  "dist",
  ".next",
  "coverage",
  ".git",
  "build",
  ".turbo",
  ".vercel",
  ".cf-ready-cache",
];

/** Windows user-profile junctions that often throw EPERM when traversed. */
export const WINDOWS_PROFILE_JUNCTIONS = [
  "Application Data",
  "Local Settings",
  "My Documents",
  "Cookies",
  "NetHood",
  "PrintHood",
  "Recent",
  "SendTo",
  "Start Menu",
  "Templates",
];

export const CATEGORY_WEIGHTS: Record<string, number> = {
  migration: 0.35,
  security: 0.3,
  "ai-readiness": 0.2,
  seo: 0.1,
  deployment: 0.05,
  observability: 0,
};

export const SEVERITY_DEDUCTIONS: Record<string, number> = {
  blocker: 100,
  high: 25,
  medium: 10,
  low: 5,
  info: 0,
  passed: 0,
};
