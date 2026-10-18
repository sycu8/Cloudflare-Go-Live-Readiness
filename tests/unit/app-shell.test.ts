import { describe, expect, it } from "vitest";
import { appShellUrl, isAppClientRoute } from "../../workers/src/app-shell.js";

describe("app shell routing", () => {
  it("keeps extensionless /app paths on the client shell", () => {
    expect(isAppClientRoute("/app")).toBe(true);
    expect(isAppClientRoute("/app/")).toBe(true);
    expect(isAppClientRoute("/app/session/1")).toBe(true);
  });

  it("leaves missing static files on the real 404 page", () => {
    expect(isAppClientRoute("/app/assets/index.js")).toBe(false);
    expect(isAppClientRoute("/favicon.ico")).toBe(false);
    expect(isAppClientRoute("/nope-xyz")).toBe(false);
    expect(isAppClientRoute("/llms-full.txt")).toBe(false);
  });

  it("fetches the directory index that html_handling serves", () => {
    const url = appShellUrl("https://ready.orangecloud.vn/app/session/1?x=1#section");
    expect(url.pathname).toBe("/app/");
    expect(url.search).toBe("");
    expect(url.hash).toBe("");
  });
});
