import { describe, it, expect } from "vitest";
import deltaTable from "../delta-table.json" assert { type: "json" };

// Validates the canonical AAIV delta table the skill ships with.
// Numbers come from the user's spec; this just guards regressions.

describe("delta-table.json", () => {
  it("has high/medium/low fail->pass entries", () => {
    expect(deltaTable.readiness.fail_to_pass.high).toBeDefined();
    expect(deltaTable.readiness.fail_to_pass.medium).toBeDefined();
    expect(deltaTable.readiness.fail_to_pass.low).toBeDefined();
  });

  it("warn->pass is roughly half of fail->pass", () => {
    const fhMin = deltaTable.readiness.fail_to_pass.high.min;
    const whMin = deltaTable.readiness.warn_to_pass.high.min;
    expect(whMin).toBeLessThanOrEqual(fhMin / 2 + 1);
  });

  it("citation high fail->pass is approximately +7", () => {
    const c = deltaTable.citation.fail_to_pass.high;
    expect(c.min).toBeGreaterThanOrEqual(5);
    expect(c.max).toBeLessThanOrEqual(9);
  });
});
