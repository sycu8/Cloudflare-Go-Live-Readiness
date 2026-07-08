import { randomUUID, webcrypto } from "node:crypto";

// Node 18 does not expose full Web Crypto globally; Workers and Node 20+ do.
if (!globalThis.crypto?.subtle) {
  const base = globalThis.crypto ?? webcrypto;
  Object.defineProperty(globalThis, "crypto", {
    value: {
      ...base,
      randomUUID: base.randomUUID ?? randomUUID,
      subtle: webcrypto.subtle,
    },
    configurable: true,
  });
} else if (!globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: randomUUID,
    configurable: true,
  });
}
