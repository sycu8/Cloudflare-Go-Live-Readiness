import { randomUUID } from "node:crypto";

// Node 18 does not expose Web Crypto globally; Workers and Node 20+ do.
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID },
    configurable: true,
  });
}
