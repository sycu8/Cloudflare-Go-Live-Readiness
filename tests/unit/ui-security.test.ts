import { describe, it, expect } from "vitest";
import { renderUserMenu } from "../../web/src/ui/auth.js";

describe("ui security", () => {
  it("escapes malicious display name in user menu", () => {
    const html = renderUserMenu('"><img onerror=alert(1)>', "user@example.invalid", null);
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("&gt;&lt;img");
  });

  it("rejects javascript: avatar URLs", () => {
    const html = renderUserMenu("Safe User", "user@example.invalid", "javascript:alert(1)");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("user-menu__initial");
  });

  it("allows https avatar URLs", () => {
    const html = renderUserMenu(
      "Safe User",
      "user@example.invalid",
      "https://avatars.example.invalid/u/1.png",
    );
    expect(html).toContain("https://avatars.example.invalid/u/1.png");
    expect(html).toContain("user-menu__avatar");
  });
});
