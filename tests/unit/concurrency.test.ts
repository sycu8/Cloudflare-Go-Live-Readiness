import { describe, it, expect } from "vitest";
import { mapWithConcurrency } from "../../workers/src/concurrency.js";

describe("mapWithConcurrency", () => {
  it("runs all items and preserves order", async () => {
    const items = [1, 2, 3, 4, 5];
    const result = await mapWithConcurrency(items, 2, async (value) => value * 2);
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });

  it("limits concurrent in-flight tasks", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = [1, 2, 3, 4];

    await mapWithConcurrency(items, 2, async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
      return true;
    });

    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});
