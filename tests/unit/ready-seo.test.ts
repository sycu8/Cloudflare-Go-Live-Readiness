import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === "dist" || name === "public" || name === ".git") continue;
      walk(full, acc);
    } else acc.push(full);
  }
  return acc;
}

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("ready site SEO", () => {
  it("points WebSite and SoftwareApplication at the Orange Cloud person", () => {
    const html = read("docs/index.html");
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).toBeTruthy();
    const graph = JSON.parse(match![1]!) as {
      "@graph": Array<Record<string, unknown>>;
    };
    const person = graph["@graph"].find((node) => node["@type"] === "Person");
    const website = graph["@graph"].find((node) => node["@type"] === "WebSite");
    const app = graph["@graph"].find((node) => node["@type"] === "SoftwareApplication");
    expect(person).toMatchObject({
      "@id": "https://orangecloud.vn/#person",
      name: "Cường Lê Sỹ",
      url: "https://orangecloud.vn/about/",
    });
    expect(person).not.toHaveProperty("worksFor");
    expect(person).not.toHaveProperty("jobTitle");
    expect(website).toMatchObject({
      author: { "@id": "https://orangecloud.vn/#person" },
      publisher: { "@id": "https://orangecloud.vn/#person" },
    });
    expect(String(website?.description)).toContain("Not a publication of Cloudflare, Inc.");
    expect(app).toMatchObject({
      author: { "@id": "https://orangecloud.vn/#person" },
      softwareHelp: "https://ready.orangecloud.vn/docs/getting-started",
    });
    expect(JSON.stringify(graph)).not.toContain("worksFor");
    expect(html).toContain("Made by Lê Sỹ Cường · OrangeCloud");
    expect(html).toContain("Not a Cloudflare, Inc. publication.");
  });

  it("canonicalizes docs to the clean URLs html_handling serves", () => {
    const docsDir = path.join(root, "docs", "docs");
    for (const name of readdirSync(docsDir)) {
      if (!name.endsWith(".html")) continue;
      const html = readFileSync(path.join(docsDir, name), "utf8");
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      expect(canonical, name).toBeTruthy();
      expect(canonical, name).not.toMatch(/\.html$/);
      expect(canonical, name).toMatch(/^https:\/\/ready\.orangecloud\.vn\/docs\/?/);
    }
    expect(read("docs/docs/index.html")).toContain(
      'href="https://ready.orangecloud.vn/docs/"',
    );
    expect(read("docs/docs/getting-started.html")).toContain(
      'href="https://ready.orangecloud.vn/docs/getting-started"',
    );
  });

  it("serves unknown URLs as a real 404 page and keeps the Web Agent shell", () => {
    const wrangler = read("wrangler.jsonc");
    expect(wrangler).toContain('"not_found_handling": "404-page"');
    expect(wrangler).not.toContain("single-page-application");
    const notFound = read("docs/404.html");
    expect(notFound).toContain('<meta name="robots" content="noindex"');
    expect(notFound).toContain("Not a Cloudflare, Inc. publication.");
    expect(notFound).toContain("<h1 id=\"not-found-title\">Page not found</h1>");
    expect(notFound).not.toContain("Cloudflare go-live checks before production");
  });

  it("lists clean URLs and the publication disclaimer in llms.txt", () => {
    const llms = read("cf-ready-brandkit/seo/llms.txt");
    expect(llms).toContain("Not a publication of Cloudflare, Inc.");
    expect(llms).toContain("https://ready.orangecloud.vn/docs/");
    expect(llms).toContain("https://ready.orangecloud.vn/docs/getting-started");
    expect(llms).not.toMatch(/https:\/\/ready\.orangecloud\.vn\/docs\/[^)\s]+\.html/);
  });

  it("does not advertise a twitter:site of @cloudflare", () => {
    const siteRoots = ["docs", "web", "workers", "cf-ready-brandkit", "src"].map((dir) =>
      path.join(root, dir),
    );
    const pattern =
      /<meta\b[^>]*name=["']twitter:site["'][^>]*content=["']@cloudflare["'][^>]*>|twitter:site["']?\s*[:=]\s*["']@cloudflare["']/i;
    const hits = siteRoots
      .flatMap((dir) => walk(dir))
      .filter((file) => pattern.test(readFileSync(file, "utf8")));
    expect(hits).toEqual([]);
  });

  it("keeps the docs footer credit while showing the disclaimer", () => {
    const docs = read("docs/docs/getting-started.html");
    expect(docs).toContain("CF Ready · MIT");
    expect(docs).toContain("Not a Cloudflare, Inc. publication.");
    expect(read("docs/index.html")).toContain('data-slug="Sycule"');
  });

  it("publishes a bilingual answer block and FAQPage", () => {
    const html = read("docs/index.html");
    expect(html).toContain('lang="vi"');
    expect(html).toContain('lang="en"');
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).toBeTruthy();
    const graph = JSON.parse(match![1]!) as {
      "@graph": Array<Record<string, unknown>>;
    };
    const faq = graph["@graph"].find((node) => node["@type"] === "FAQPage");
    expect(faq).toMatchObject({
      "@id": "https://ready.orangecloud.vn/#answers",
      inLanguage: ["vi", "en"],
    });
    const questions = faq?.mainEntity as Array<{
      name: string;
      acceptedAnswer: { text: string };
    }>;
    expect(questions).toHaveLength(2);
    for (const question of questions) {
      expect(html).toContain(question.name);
      expect(html).toContain(question.acceptedAnswer.text);
    }
    expect(html).not.toContain("Trịnh Hoàng Tú");
  });

  it("links the hub and sibling projects from the footer", () => {
    const pages = [
      "docs/index.html",
      "docs/404.html",
      "docs/blog/index.html",
      "docs/docs/getting-started.html",
      "workers/src/blog/html.ts",
    ];
    for (const rel of pages) {
      const html = read(rel);
      expect(html, rel).toContain('href="https://orangecloud.vn"');
      expect(html, rel).toContain('href="https://onboarding.orangecloud.vn"');
      expect(html, rel).toContain('href="https://launch.orangecloud.vn"');
      expect(html, rel).toContain('href="https://lookup.orangecloud.vn"');
    }
  });

  it("gives public pages a title, description, canonical, and Open Graph tags", () => {
    const files = walk(path.join(root, "docs")).filter((file) => file.endsWith(".html"));
    files.push(path.join(root, "web/index.html"));
    for (const file of files) {
      if (file.endsWith(`${path.sep}404.html`)) continue;
      const html = readFileSync(file, "utf8");
      const name = path.relative(root, file);
      expect(html, name).toMatch(/<title>[^<]+<\/title>/);
      expect(html, name).toMatch(/<meta\b[^>]*name=["']description["']/);
      expect(html, name).toMatch(
        /<link\s+rel="canonical"\s+href="https:\/\/ready\.orangecloud\.vn\/[^"]*"/,
      );
      for (const prop of ["og:title", "og:description", "og:url", "og:image"]) {
        expect(html, `${name} ${prop}`).toMatch(
          new RegExp(`<meta\\b[^>]*property=["']${prop}["']`),
        );
      }
    }
  });

  it("points the README at the live site and disables workers.dev", () => {
    expect(read("README.md")).toContain("[https://ready.orangecloud.vn](https://ready.orangecloud.vn)");
    expect(read("wrangler.jsonc")).toContain('"workers_dev": false');
    expect(read("workers/src/index.ts")).toContain("withNonCanonicalRobots");
  });
});
