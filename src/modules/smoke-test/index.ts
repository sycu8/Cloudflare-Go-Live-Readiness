import type { CfReadyConfig, Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";
import { createFinding, createPassedFinding } from "../../core/findings.js";

export type SmokeTestResult = {
  url: string;
  status: number | null;
  responseTimeMs: number;
  ok: boolean;
  error?: string;
};

export type SmokeTestReport = {
  baseUrl: string;
  results: Array<SmokeTestResult & { path: string }>;
  headers: Record<string, string>;
  redirectChain: string[];
  findings: Finding[];
};

const SECURITY_HEADERS = [
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "content-security-policy",
];

export async function fetchRoute(
  baseUrl: string,
  route: string,
): Promise<SmokeTestResult & { path: string }> {
  const url = new URL(route, baseUrl).toString();
  const start = Date.now();
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    return {
      path: route,
      url,
      status: response.status,
      responseTimeMs: Date.now() - start,
      ok: response.ok,
    };
  } catch (error) {
    return {
      path: route,
      url,
      status: null,
      responseTimeMs: Date.now() - start,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runSmokeTest(
  url: string,
  config: CfReadyConfig,
  inspection?: RepositoryInspection,
): Promise<SmokeTestReport> {
  const baseUrl = url.replace(/\/$/, "");
  const routes = [
    "/",
    "/robots.txt",
    "/sitemap.xml",
    "/llms.txt",
    ...(config.criticalRoutes ?? []).filter((r) => !["/", "/robots.txt"].includes(r)),
  ];
  const uniqueRoutes = [...new Set(routes)];

  const results: SmokeTestReport["results"] = [];
  for (const route of uniqueRoutes) {
    results.push(await fetchRoute(baseUrl, route));
  }

  let headers: Record<string, string> = {};
  const redirectChain: string[] = [];

  try {
    const homeResponse = await fetch(baseUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    homeResponse.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    if (homeResponse.status >= 300 && homeResponse.status < 400) {
      const location = homeResponse.headers.get("location");
      if (location) redirectChain.push(location);
    }
  } catch {
    headers = {};
  }

  const findings: Finding[] = [];

  const home = results.find((r) => r.path === "/");
  if (home?.ok) {
    findings.push(createPassedFinding("deployment", "Homepage responds", `Homepage returned ${home.status}.`));
  } else {
    findings.push(
      createFinding({
        category: "deployment",
        severity: "blocker",
        title: "Homepage unreachable",
        description: home?.error ?? `Homepage returned status ${home?.status}`,
        recommendation: "Fix deployment and DNS before go-live.",
        autoFixAvailable: false,
        requiresApproval: true,
      }),
    );
  }

  for (const result of results) {
    if (result.path === "/") continue;
    if (!result.ok && result.status !== 404) {
      findings.push(
        createFinding({
          category: "deployment",
          severity: "medium",
          title: `${result.path} check failed`,
          description: result.error ?? `Status ${result.status}`,
          recommendation: `Ensure ${result.path} is deployed and accessible.`,
          autoFixAvailable: false,
          requiresApproval: false,
        }),
      );
    }
  }

  const missingHeaders = SECURITY_HEADERS.filter((h) => !headers[h]);
  if (missingHeaders.length > 0) {
    findings.push(
      createFinding({
        category: "security",
        severity: "medium",
        title: "Missing security headers",
        description: `Missing: ${missingHeaders.join(", ")}`,
        recommendation: "Configure security headers via Cloudflare Transform Rules or origin.",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  } else if (Object.keys(headers).length > 0) {
    findings.push(
      createPassedFinding("security", "Security headers present", "Key security headers detected."),
    );
  }

  const slowRoutes = results.filter((r) => r.responseTimeMs > 3000);
  if (slowRoutes.length > 0) {
    findings.push(
      createFinding({
        category: "deployment",
        severity: "low",
        title: "Slow response time",
        description: `${slowRoutes.length} route(s) took >3s.`,
        evidence: slowRoutes.map((r) => `${r.path}: ${r.responseTimeMs}ms`).join(", "),
        recommendation: "Investigate CDN caching and origin performance.",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  if (inspection) {
    void inspection;
  }

  return { baseUrl, results, headers, redirectChain, findings };
}
