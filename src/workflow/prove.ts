// Prove loop — after a fix is shipped, verify it actually moved the needle.
// Compares two AIV scans (before/after) and produces a signed-off summary.

import type { AivResult, EngineId } from "../radar/types.js";

export interface ProveDelta {
  visibilityScore: { before: number; after: number; delta: number };
  totalMentions: { before: number; after: number; delta: number };
  newlyCitedEngines: EngineId[];
  lostCitedEngines: EngineId[];
  newlyMentionedQueries: string[];
  newCompetitorsCiting: string[];
  proven: boolean;            // true if delta is meaningfully positive
  confidence: "high" | "medium" | "low";
  notes: string[];
}

const MIN_DELTA_FOR_HIGH = 0.5;   // visibility score points (out of 10)
const MIN_DELTA_FOR_MEDIUM = 0.2;

function citedEngines(r: AivResult): Set<EngineId> {
  return new Set(r.perEngineScores.filter((e) => e.cited).map((e) => e.engine));
}

function mentionedQueries(r: AivResult): Set<string> {
  return new Set(
    r.queryResults
      .filter((q) => q.verificationStatus === "PASS")
      .map((q) => q.query),
  );
}

export function compareScans(before: AivResult, after: AivResult): ProveDelta {
  const visDelta = Number((after.visibilityScore - before.visibilityScore).toFixed(2));
  const menDelta = after.totalMentions - before.totalMentions;

  const beforeCited = citedEngines(before);
  const afterCited = citedEngines(after);
  const newlyCitedEngines = [...afterCited].filter((e) => !beforeCited.has(e));
  const lostCitedEngines = [...beforeCited].filter((e) => !afterCited.has(e));

  const beforeQ = mentionedQueries(before);
  const afterQ = mentionedQueries(after);
  const newlyMentionedQueries = [...afterQ].filter((q) => !beforeQ.has(q));

  const beforeComp = new Set(before.detectedCompetitorNames);
  const newCompetitorsCiting = after.detectedCompetitorNames.filter((n) => !beforeComp.has(n));

  const notes: string[] = [];
  if (lostCitedEngines.length) notes.push(`Lost citations in: ${lostCitedEngines.join(", ")}`);
  if (newCompetitorsCiting.length) notes.push(`New competitors entered: ${newCompetitorsCiting.join(", ")}`);
  if (visDelta > 0 && newlyCitedEngines.length === 0 && newlyMentionedQueries.length === 0) {
    notes.push("Score moved without engine/query changes — verify scan parity (probe set unchanged?).");
  }

  let confidence: ProveDelta["confidence"] = "low";
  if (visDelta >= MIN_DELTA_FOR_HIGH || newlyCitedEngines.length >= 1) confidence = "high";
  else if (visDelta >= MIN_DELTA_FOR_MEDIUM || newlyMentionedQueries.length >= 2) confidence = "medium";

  const proven = visDelta > 0 && lostCitedEngines.length === 0;

  return {
    visibilityScore: { before: before.visibilityScore, after: after.visibilityScore, delta: visDelta },
    totalMentions: { before: before.totalMentions, after: after.totalMentions, delta: menDelta },
    newlyCitedEngines,
    lostCitedEngines,
    newlyMentionedQueries,
    newCompetitorsCiting,
    proven,
    confidence,
    notes,
  };
}

export function renderProve(d: ProveDelta): string {
  const lines: string[] = [];
  const sign = d.visibilityScore.delta >= 0 ? "+" : "";
  lines.push(`Prove: visibility ${d.visibilityScore.before.toFixed(1)} → ${d.visibilityScore.after.toFixed(1)} (${sign}${d.visibilityScore.delta})`);
  lines.push(`Mentions: ${d.totalMentions.before} → ${d.totalMentions.after} (${d.totalMentions.delta >= 0 ? "+" : ""}${d.totalMentions.delta})`);
  if (d.newlyCitedEngines.length) lines.push(`Newly citing: ${d.newlyCitedEngines.join(", ")}`);
  if (d.newlyMentionedQueries.length) lines.push(`New queries mentioning you: ${d.newlyMentionedQueries.length}`);
  for (const n of d.notes) lines.push(`Note: ${n}`);
  lines.push(`Verdict: ${d.proven ? "PROVEN" : "NOT PROVEN"} (confidence: ${d.confidence})`);
  return lines.join("\n");
}
