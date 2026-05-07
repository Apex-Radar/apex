import { describe, it, expect } from "vitest";
import { compareScans } from "../src/workflow/prove.js";
import type { AivResult } from "../src/radar/types.js";

function mkResult(over: Partial<AivResult> = {}): AivResult {
  return {
    reportType: "aiv",
    clientBrandName: "Acme",
    configuredBrandName: "Acme",
    clientWebsiteUrl: "https://acme.test",
    configuredProbeQueries: [],
    brandAliases: [],
    scannedAt: new Date().toISOString(),
    visibilityScore: 5,
    previousScore: 5,
    deltaScore: 0,
    perEngineScores: [
      { engine: "chatgpt", score: 5, cited: false, mentioned: true },
      { engine: "claude",  score: 5, cited: false, mentioned: true },
    ],
    competitorScores: [],
    enginesActive: ["chatgpt", "claude"],
    totalQueriesRun: 10,
    totalMentions: 5,
    topMentionText: "",
    topMentionEngine: null,
    unmentionedEngines: [],
    perplexityLinkedToSite: false,
    detectedCompetitorNames: [],
    competitorReasons: {},
    fixesThisWeek: [],
    mentionDetails: [],
    aeoReadiness: { overall: 5 },
    queryResults: [],
    ...over,
  };
}

describe("compareScans", () => {
  it("flags newly cited engine and proven=true", () => {
    const before = mkResult();
    const after = mkResult({
      visibilityScore: 6,
      perEngineScores: [
        { engine: "chatgpt", score: 7, cited: true, mentioned: true },
        { engine: "claude",  score: 5, cited: false, mentioned: true },
      ],
    });
    const d = compareScans(before, after);
    expect(d.newlyCitedEngines).toContain("chatgpt");
    expect(d.lostCitedEngines).toEqual([]);
    expect(d.proven).toBe(true);
    expect(d.confidence).toBe("high");
  });

  it("flags lost engine and proven=false", () => {
    const before = mkResult({
      perEngineScores: [
        { engine: "chatgpt", score: 7, cited: true, mentioned: true },
        { engine: "claude",  score: 5, cited: false, mentioned: true },
      ],
    });
    const after = mkResult({
      visibilityScore: 4,
      perEngineScores: [
        { engine: "chatgpt", score: 4, cited: false, mentioned: true },
        { engine: "claude",  score: 5, cited: false, mentioned: true },
      ],
    });
    const d = compareScans(before, after);
    expect(d.lostCitedEngines).toContain("chatgpt");
    expect(d.proven).toBe(false);
  });
});
