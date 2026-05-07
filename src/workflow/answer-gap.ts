// Answer Gap workflow — the killer feature.
// Pulls Radar's answer-gap rows, ranks by competitor-cited / not-you,
// and emits per-row brief specs that downstream brief generators consume.

import type { AnswerGapResponse, AnswerGapRow } from "../radar/types.js";

export interface BriefSpec {
  query: string;
  engine: string;
  competitorsToBeat: string[];
  angle: string;
  formatHints: string[];
  schemaHints: string[];
}

export function rankGaps(rows: AnswerGapRow[]): AnswerGapRow[] {
  // Worst gaps first: not cited, has competitors cited, low mention rate.
  return [...rows].sort((a, b) => {
    const aScore = (a.cited ? 0 : 2) + (a.competitorsCited.length ? 1 : 0) + (1 - a.mentionRate);
    const bScore = (b.cited ? 0 : 2) + (b.competitorsCited.length ? 1 : 0) + (1 - b.mentionRate);
    return bScore - aScore;
  });
}

export function specForRow(row: AnswerGapRow): BriefSpec {
  const angle = row.competitorsCited.length
    ? `Displace ${row.competitorsCited.slice(0, 3).join(", ")} for "${row.query}"`
    : `Establish first-cited answer for "${row.query}"`;

  return {
    query: row.query,
    engine: row.engine,
    competitorsToBeat: row.competitorsCited,
    angle,
    formatHints: [
      "Lede answers the literal question in the first 40 words",
      "Use a definitional sentence that an LLM can lift verbatim",
      "Numbered steps or comparison table where it fits the query",
      "One short FAQ block at the end (2–4 Q&A)",
    ],
    schemaHints: ["FAQPage", "Article", "HowTo (only if literally how-to)"],
  };
}

export function planBriefs(resp: AnswerGapResponse, max = 5): BriefSpec[] {
  return rankGaps(resp.rows).slice(0, max).map(specForRow);
}
