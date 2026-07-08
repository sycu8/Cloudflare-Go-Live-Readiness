import { describe, it, expect, vi } from "vitest";
import { isGitHubConnected } from "../../workers/src/auth/users.js";

describe("isGitHubConnected", () => {
  it("returns true when github identity exists", async () => {
    const env = {
      DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            all: vi.fn(async () => ({
              results: [{ provider: "github", providerUserId: "1" }],
            })),
          })),
        })),
      },
    };

    await expect(isGitHubConnected(env as never, "user-1")).resolves.toBe(true);
  });

  it("returns true when github token exists in KV", async () => {
    const env = {
      DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            all: vi.fn(async () => ({ results: [] })),
          })),
        })),
      },
      SESSIONS: {
        get: vi.fn(async (key: string) =>
          key === "github:user:user-2" ? "token-abc" : null,
        ),
      },
    };

    await expect(isGitHubConnected(env as never, "user-2")).resolves.toBe(true);
  });

  it("returns false when no github link exists", async () => {
    const env = {
      DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            all: vi.fn(async () => ({ results: [{ provider: "google", providerUserId: "g1" }] })),
          })),
        })),
      },
      SESSIONS: {
        get: vi.fn(async () => null),
      },
    };

    await expect(isGitHubConnected(env as never, "user-3")).resolves.toBe(false);
  });
});
