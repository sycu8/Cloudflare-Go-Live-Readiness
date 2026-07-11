const MAX_SANDBOX_ID_LEN = 63;

type SessionIdState = {
  id: { name?: string; toString(): string };
};

/** Sandbox IDs must be 1–63 chars; DO id.toString() is 64-char hex. */
export function resolveSessionId(state: SessionIdState, storedId?: string): string {
  const named = state.id.name?.trim();
  if (named && named.length <= MAX_SANDBOX_ID_LEN) return named;

  const fromStored = storedId?.trim();
  if (fromStored && fromStored.length >= 1 && fromStored.length <= MAX_SANDBOX_ID_LEN) {
    return fromStored;
  }

  if (fromStored && fromStored.length > MAX_SANDBOX_ID_LEN) {
    return fromStored.slice(0, MAX_SANDBOX_ID_LEN);
  }

  const hex = state.id.toString();
  return hex.slice(0, MAX_SANDBOX_ID_LEN);
}
