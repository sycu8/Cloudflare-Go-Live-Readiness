import { randomUUID, webcrypto } from "node:crypto";

// Node 18 does not expose full Web Crypto globally; Workers and Node 20+ do.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

if (!globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: () => randomUUID(),
    configurable: true,
  });
}
