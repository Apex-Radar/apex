import { describe, it, expect } from "vitest";
import { estimateProbe, estimateMany } from "../src/core/cost/estimator.js";

describe("estimateProbe", () => {
  it("computes USD from per-1k rates", () => {
    const e = estimateProbe({ provider: "openai", queries: 10, avgInputTokens: 100, avgOutputTokens: 500 });
    expect(e.inputTokens).toBe(1000);
    expect(e.outputTokens).toBe(5000);
    expect(e.estimatedUsd).toBeGreaterThan(0);
  });
});

describe("estimateMany", () => {
  it("sums totals", () => {
    const { rows, totalUsd } = estimateMany([
      { provider: "openai", queries: 5, avgInputTokens: 100, avgOutputTokens: 300 },
      { provider: "anthropic", queries: 5, avgInputTokens: 100, avgOutputTokens: 300 },
    ]);
    expect(rows).toHaveLength(2);
    expect(totalUsd).toBeCloseTo(rows[0].estimatedUsd + rows[1].estimatedUsd, 4);
  });
});
