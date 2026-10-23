import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Env } from "../../workers/src/types.js";

vi.mock("@cloudflare/sandbox", () => ({
  Sandbox: class Sandbox {},
  getSandbox() {
    throw new Error("sandbox is not used when serving HTML");
  },
}));

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

type WorkerFetch = (request: Request, env: Env) => Promise<Response>;

let workerFetch: WorkerFetch;

beforeAll(async () => {
  const worker = await import("../../workers/src/index.js");
  workerFetch = worker.default.fetch;
});

function patternMatches(pattern: string, pathname: string): boolean {
  const source = `^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`;
  return new RegExp(source).test(pathname);
}

/** True when wrangler routes this path to the Worker ahead of the asset. */
function workerRunsFirst(wrangler: string, pathname: string): boolean {
  const match = wrangler.match(/"run_worker_first"\s*:\s*(true|\[[\s\S]*?\])/);
  if (!match) return false;
  if (match[1] === "true") return true;
  const patterns = [...match[1]!.matchAll(/"(!?\/[^"]*)"/g)].map((item) => item[1]!);
  const negatives = patterns.filter((pattern) => pattern.startsWith("!")).map((pattern) => pattern.slice(1));
  const positives = patterns.filter((pattern) => !pattern.startsWith("!"));
  if (negatives.some((pattern) => patternMatches(pattern, pathname))) return false;
  return positives.some((pattern) => patternMatches(pattern, pathname));
}

function envServing(body: string, contentType: string, seen: string[]): Env {
  return {
    ASSETS: {
      fetch: async (request: Request) => {
        seen.push(new URL(request.url).pathname);
        return new Response(body, {
          status: 200,
          headers: { "Content-Type": contentType },
        });
      },
    },
  } as Env;
}

describe("HTML routes reach the worker for robots tags", () => {
  const wrangler = readFileSync(path.join(root, "wrangler.jsonc"), "utf8");

  it("invokes the worker before HTML assets and still binds ASSETS", () => {
    expect(wrangler).toContain('"binding": "ASSETS"');
    expect(wrangler).toContain('"directory": "./public"');
    for (const pathname of ["/", "/docs/npm", "/app/", "/index.html", "/docs/getting-started"]) {
      expect(workerRunsFirst(wrangler, pathname), pathname).toBe(true);
    }
    expect(workerRunsFirst(wrangler, "/assets/site.css")).toBe(false);
    expect(workerRunsFirst(wrangler, "/sitemap.xml")).toBe(false);
  });

  it("returns noindex for / on a non-canonical host and omits it on the canonical host", async () => {
    const html = "<!doctype html><title>CF Ready</title>";
    const cases = [
      { url: "https://cf-ready-docs.example.workers.dev/", robots: "noindex, nofollow" },
      { url: "https://ready.orangecloud.vn/", robots: null },
    ];
    for (const item of cases) {
      const seen: string[] = [];
      const response = await workerFetch(new Request(item.url), envServing(html, "text/html; charset=utf-8", seen));
      expect(response.status, item.url).toBe(200);
      expect(response.headers.get("Content-Type"), item.url).toContain("text/html");
      expect(response.headers.get("X-Robots-Tag"), item.url).toBe(item.robots);
      expect(seen, item.url).toEqual(["/"]);
      expect(await response.text(), item.url).toContain("CF Ready");
    }
  });

  it("adds noindex on /docs/npm and /app/ only for non-canonical hosts", async () => {
    const pages = ["/docs/npm", "/app/", "/blog/"];
    for (const pathname of pages) {
      const seen: string[] = [];
      const preview = await workerFetch(
        new Request(`https://preview.example.com${pathname}`),
        envServing("<html>page</html>", "text/html; charset=utf-8", seen),
      );
      expect(preview.headers.get("X-Robots-Tag"), pathname).toBe("noindex, nofollow");
      expect(seen).toEqual([pathname]);
      expect(await preview.text()).toContain("page");

      const canonical = await workerFetch(
        new Request(`https://ready.orangecloud.vn${pathname}`),
        envServing("<html>page</html>", "text/html; charset=utf-8", []),
      );
      expect(canonical.headers.get("X-Robots-Tag"), pathname).toBeNull();
      expect(await canonical.text()).toContain("page");
    }
  });

  it("renders the blog index from D1 when the static asset is missing", async () => {
    const env = {
      ASSETS: {
        fetch: async () => new Response("missing", { status: 404 }),
      },
    } as Env;
    const response = await workerFetch(new Request("https://preview.example.com/blog/"), env);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(await response.text()).toContain("Check back soon");
  });
});
