import { describe, expect, it } from "vitest";
import {
  CANONICAL_HOST,
  isCanonicalHost,
  withNonCanonicalRobots,
} from "../../workers/src/robots-host.js";

describe("non-canonical host robots policy", () => {
  it("leaves the production host unchanged", () => {
    const request = new Request(`https://${CANONICAL_HOST}/docs/getting-started`);
    const response = new Response("ok", { status: 200, headers: { "X-Test": "1" } });
    const out = withNonCanonicalRobots(request, response);
    expect(isCanonicalHost(CANONICAL_HOST)).toBe(true);
    expect(out.headers.get("X-Robots-Tag")).toBeNull();
    expect(out.headers.get("X-Test")).toBe("1");
    expect(out.status).toBe(200);
  });

  it("sends noindex on workers.dev and other hosts", async () => {
    const hosts = [
      "https://cf-ready-docs.sycu-lee.workers.dev/",
      "https://preview.example.com/app/",
      "http://localhost:8787/",
    ];
    for (const url of hosts) {
      const out = withNonCanonicalRobots(
        new Request(url),
        new Response("<html>ready</html>", {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      );
      expect(out.headers.get("X-Robots-Tag"), url).toBe("noindex, nofollow");
      expect(out.headers.get("Content-Type"), url).toContain("text/html");
      expect(await out.text()).toContain("ready");
    }
  });
});
