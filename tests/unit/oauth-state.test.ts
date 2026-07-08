import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOAuthState, consumeOAuthState } from "../../workers/src/auth/oauth-state.js";

function mockKv() {
  const store = new Map<string, string>();
  return {
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    _store: store,
  };
}

describe("oauth-state", () => {
  let kv: ReturnType<typeof mockKv>;

  beforeEach(() => {
    kv = mockKv();
  });

  it("creates and consumes OAuth state once", async () => {
    const env = { SESSIONS: kv as unknown as KVNamespace };
    const id = await createOAuthState(env, {
      mode: "login",
      provider: "google",
      returnTo: "/app/",
    });

    const payload = await consumeOAuthState(env, id);
    expect(payload?.provider).toBe("google");
    expect(payload?.mode).toBe("login");

    const again = await consumeOAuthState(env, id);
    expect(again).toBeNull();
  });
});
