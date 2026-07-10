import { describe, it, expect, vi } from "vitest";
import {
  isRetryableSandboxError,
  formatSandboxError,
  withSandboxRetry,
} from "../../workers/src/sandbox-retry.js";

describe("sandbox-retry", () => {
  it("detects OperationInterruptedError as retryable", () => {
    expect(
      isRetryableSandboxError(
        new Error(
          "Sandbox operation utils.createSession was interrupted while the runtime connection was closing",
        ),
      ),
    ).toBe(true);
  });

  it("formatSandboxError returns friendly message", () => {
    expect(
      formatSandboxError(
        new Error("OperationInterruptedError: runtime connection was closing"),
      ),
    ).toContain("Sandbox container is starting");
  });

  it("withSandboxRetry retries then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("createSession interrupted"))
      .mockResolvedValueOnce("ok");

    await expect(withSandboxRetry(fn, { baseDelayMs: 1 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("withSandboxRetry does not retry non-sandbox errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("permission denied"));
    await expect(withSandboxRetry(fn)).rejects.toThrow("permission denied");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("isSandboxStartingMessage matches formatted sandbox errors", async () => {
    const { isSandboxStartingMessage } = await import("../../workers/src/sandbox-retry.js");
    expect(isSandboxStartingMessage(formatSandboxError(new Error("createSession")))).toBe(true);
  });
});
