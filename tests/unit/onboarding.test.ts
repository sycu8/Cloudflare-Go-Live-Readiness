import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STORAGE_KEY,
  hasCompletedOnboarding,
  markOnboardingComplete,
  resetOnboarding,
} from "../../web/src/ui/onboarding.js";

describe("onboarding", () => {
  const store = new Map<string, string>();
  const original = globalThis.localStorage;

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });
    resetOnboarding();
  });

  afterEach(() => {
    if (original) {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: original,
      });
    }
  });

  it("defines a multi-step tour", () => {
    expect(ONBOARDING_STEPS.length).toBeGreaterThanOrEqual(4);
    expect(ONBOARDING_STEPS[0]?.title).toBeTruthy();
    expect(ONBOARDING_STEPS.some((s) => s.tab === "project")).toBe(true);
    expect(ONBOARDING_STEPS.some((s) => s.tab === "results")).toBe(true);
  });

  it("tracks completion in localStorage", () => {
    expect(hasCompletedOnboarding()).toBe(false);
    markOnboardingComplete();
    expect(hasCompletedOnboarding()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe("done");
    resetOnboarding();
    expect(hasCompletedOnboarding()).toBe(false);
  });
});
