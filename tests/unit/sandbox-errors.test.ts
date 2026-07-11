import { describe, it, expect } from "vitest";
import { isSandboxStartingMessage } from "../../web/src/api/sandbox-errors.js";

describe("isSandboxStartingMessage", () => {
  it("detects friendly sandbox cold-start copy", () => {
    expect(
      isSandboxStartingMessage(
        "Sandbox container is starting or reconnecting. Wait a few seconds and try again.",
      ),
    ).toBe(true);
  });

  it("detects underlying createSession errors", () => {
    expect(
      isSandboxStartingMessage("Sandbox operation utils.createSession was interrupted"),
    ).toBe(true);
  });

  it("detects reconnecting-only sandbox messages", () => {
    expect(isSandboxStartingMessage("sandbox container is starting or reconnecting")).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isSandboxStartingMessage("No project imported")).toBe(false);
  });
});
