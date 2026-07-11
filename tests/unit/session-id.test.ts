import { describe, it, expect } from "vitest";
import { resolveSessionId } from "../../workers/src/session-id.js";

describe("resolveSessionId", () => {
  const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const hex64 = "a".repeat(64);

  it("prefers durable object name (workspace session uuid)", () => {
    const id = resolveSessionId({
      id: { name: uuid, toString: () => hex64 },
    });
    expect(id).toBe(uuid);
    expect(id.length).toBeLessThanOrEqual(63);
  });

  it("truncates legacy 64-char stored ids", () => {
    const id = resolveSessionId(
      { id: { toString: () => hex64 } },
      hex64,
    );
    expect(id).toHaveLength(63);
  });

  it("uses valid stored id when name is missing", () => {
    const short = "session-123";
    const id = resolveSessionId({ id: { toString: () => hex64 } }, short);
    expect(id).toBe(short);
  });
});
