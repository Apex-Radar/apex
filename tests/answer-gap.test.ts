import { describe, it, expect } from "vitest";
import { rankGaps, specForRow } from "../src/workflow/answer-gap.js";
import type { AnswerGapRow } from "../src/radar/types.js";

const rows: AnswerGapRow[] = [
  { query: "best widget", engine: "chatgpt", cited: true,  mentionRate: 0.9, competitorsCited: [],            briefAvailable: false },
  { query: "cheap widget", engine: "perplexity", cited: false, mentionRate: 0.2, competitorsCited: ["AcmeCo"], briefAvailable: false },
  { query: "fast widget",  engine: "claude",    cited: false, mentionRate: 0.0, competitorsCited: ["AcmeCo", "Beta"], briefAvailable: false },
];

describe("answer-gap.rankGaps", () => {
  it("puts uncited+competitor-cited rows first", () => {
    const ranked = rankGaps(rows);
    expect(ranked[0].query).toBe("fast widget");
    expect(ranked[ranked.length - 1].query).toBe("best widget");
  });
});

describe("answer-gap.specForRow", () => {
  it("uses displace angle when competitors are cited", () => {
    const spec = specForRow(rows[1]);
    expect(spec.angle).toMatch(/Displace/);
    expect(spec.competitorsToBeat).toEqual(["AcmeCo"]);
  });

  it("uses establish angle when no competitors are cited", () => {
    const spec = specForRow({ ...rows[0], cited: false, competitorsCited: [] });
    expect(spec.angle).toMatch(/Establish/);
  });
});
