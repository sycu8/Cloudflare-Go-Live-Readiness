import fg from "fast-glob";
import path from "node:path";
import { createFinding, createPassedFinding } from "../../core/findings.js";
import { readTextFile } from "../../core/filesystem.js";
import { SCAN_EXCLUDE_DIRS } from "../../config/default-rules.js";
import type { CfReadyConfig, Finding } from "../../config/schema.js";
import type { RepositoryInspection } from "../../inspectors/types.js";

export async function checkMetadata(
  inspection: RepositoryInspection,
  config: CfReadyConfig,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const files = await fg(
    ["**/*.{html,tsx,jsx,vue}", "app/**/layout.{tsx,jsx}", "index.html"],
    {
      cwd: inspection.rootDir,
      ignore: SCAN_EXCLUDE_DIRS.map((d) => `**/${d}/**`),
    },
  );

  let hasTitle = false;
  let hasDescription = false;
  let hasOg = false;
  let hasTwitter = false;
  let hasCanonical = false;
  let hasJsonLd = false;

  for (const file of files.slice(0, 50)) {
    const content = await readTextFile(path.join(inspection.rootDir, file));
    if (!content) continue;

    if (/<title[^>]*>/.test(content) || /title:\s*['"]/.test(content)) hasTitle = true;
    if (/meta[^>]+description/i.test(content) || /description:\s*['"]/.test(content))
      hasDescription = true;
    if (/og:title|property=["']og:/i.test(content)) hasOg = true;
    if (/twitter:card|name=["']twitter:/i.test(content)) hasTwitter = true;
    if (/rel=["']canonical["']/i.test(content) || /canonical:\s*['"]/.test(content))
      hasCanonical = true;
    if (/application\/ld\+json/i.test(content)) hasJsonLd = true;
  }

  const checks = [
    { ok: hasTitle, title: "Page title", fix: "Add <title> or metadata title export." },
    {
      ok: hasDescription,
      title: "Meta description",
      fix: "Add meta description tag or Next.js metadata.description.",
    },
    { ok: hasOg, title: "Open Graph metadata", fix: "Add og:title, og:description, og:image." },
    { ok: hasTwitter, title: "Twitter/X card metadata", fix: "Add twitter:card and twitter:title." },
    { ok: hasCanonical, title: "Canonical URL", fix: "Add canonical link for primary pages." },
    { ok: hasJsonLd, title: "JSON-LD structured data", fix: "Add Organization or WebSite schema." },
  ];

  for (const check of checks) {
    if (check.ok) {
      findings.push(createPassedFinding("seo", `${check.title} detected`, `${check.title} found in source.`));
    } else {
      findings.push(
        createFinding({
          category: "seo",
          severity: "medium",
          title: `Missing ${check.title}`,
          description: `${check.title} not detected in scanned files.`,
          recommendation: config.seo?.defaultTitle
            ? `${check.fix} Suggested title: "${config.seo.defaultTitle}"`
            : check.fix,
          autoFixAvailable: true,
          requiresApproval: false,
        }),
      );
    }
  }

  const hasSitemap =
    inspection.detectedFiles.includes("public/sitemap.xml") ||
    inspection.importantFiles["public/sitemap.xml"];
  const hasRobots =
    inspection.detectedFiles.includes("public/robots.txt") ||
    inspection.importantFiles["public/robots.txt"];

  if (!hasSitemap) {
    findings.push(
      createFinding({
        category: "seo",
        severity: "medium",
        title: "Missing sitemap.xml",
        description: "No sitemap found for search engine discovery.",
        recommendation: "Run cf-ready fix --seo to generate sitemap draft.",
        autoFixAvailable: true,
        requiresApproval: false,
      }),
    );
  }

  if (!hasRobots) {
    findings.push(
      createFinding({
        category: "seo",
        severity: "low",
        title: "Missing robots.txt",
        description: "robots.txt helps control crawler access.",
        recommendation: "Run cf-ready fix --seo or fix --ai-readiness.",
        autoFixAvailable: true,
        requiresApproval: false,
      }),
    );
  }

  return findings;
}

export async function checkImages(inspection: RepositoryInspection): Promise<Finding[]> {
  const findings: Finding[] = [];
  const files = await fg(["**/*.{tsx,jsx,html}"], {
    cwd: inspection.rootDir,
    ignore: SCAN_EXCLUDE_DIRS.map((d) => `**/${d}/**`),
  });

  let imagesWithoutAlt = 0;
  for (const file of files.slice(0, 30)) {
    const content = await readTextFile(path.join(inspection.rootDir, file));
    if (!content) continue;
    const imgTags = content.match(/<img[^>]*>/gi) ?? [];
    for (const tag of imgTags) {
      if (!/alt\s*=/.test(tag)) imagesWithoutAlt++;
    }
  }

  if (imagesWithoutAlt > 0) {
    findings.push(
      createFinding({
        category: "seo",
        severity: "low",
        title: "Images missing alt text",
        description: `${imagesWithoutAlt} <img> tag(s) without alt attribute detected.`,
        recommendation: "Add descriptive alt text to all images for accessibility and SEO.",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  return findings;
}

export async function checkHeadings(inspection: RepositoryInspection): Promise<Finding[]> {
  const findings: Finding[] = [];
  const files = await fg(["**/*.{tsx,jsx,html}"], {
    cwd: inspection.rootDir,
    ignore: SCAN_EXCLUDE_DIRS.map((d) => `**/${d}/**`),
  });

  let missingH1 = 0;
  for (const file of files.slice(0, 20)) {
    const content = await readTextFile(path.join(inspection.rootDir, file));
    if (!content) continue;
    if (/<h1/i.test(content) || content.includes("<h1")) continue;
    if (/<html/i.test(content) || file.endsWith(".html")) missingH1++;
  }

  if (missingH1 > 2) {
    findings.push(
      createFinding({
        category: "seo",
        severity: "low",
        title: "Heading hierarchy concerns",
        description: "Some HTML pages may be missing h1 headings.",
        recommendation: "Ensure each page has exactly one h1 with primary keyword.",
        autoFixAvailable: false,
        requiresApproval: false,
      }),
    );
  }

  return findings;
}

export async function runSeoChecks(
  inspection: RepositoryInspection,
  config: CfReadyConfig,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  findings.push(...(await checkMetadata(inspection, config)));
  findings.push(...(await checkImages(inspection)));
  findings.push(...(await checkHeadings(inspection)));
  return findings;
}

export function generateSeoReadinessReport(
  inspection: RepositoryInspection,
  findings: Finding[],
): string {
  const seoFindings = findings.filter((f) => f.category === "seo");
  return [
    "# SEO Readiness Report",
    "",
    `**Project:** ${inspection.projectName}`,
    "",
    "## Findings",
    "",
    ...seoFindings.flatMap((f) => [
      `### [${f.severity}] ${f.title}`,
      "",
      f.description,
      "",
      f.recommendation,
      "",
    ]),
  ].join("\n");
}
