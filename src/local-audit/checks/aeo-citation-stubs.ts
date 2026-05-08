import type { AuditCheck } from "../../radar/types.js";

/**
 * Citation-only AEO checks — mirrors CITATION_CHECK_NAMES in
 * apex-worker-do/src/checks/aeo-checks.js. These cannot be graded in pure
 * Cheerio local mode because they require live AI engine probes (ChatGPT,
 * Claude, Perplexity) or AI-derived analysis.
 *
 * To preserve denominator parity with the worker's AEO scoring (49 total
 * AEO checks), we MUST include them in free-mode results — emitted with
 * `status: "skipped"` so they pull the visible score down honestly without
 * the ugly fail→pass overwrite path when BYOK fills them in later.
 *
 * Math: 49 AEO checks. 13 citation. 36 portable. Free-mode ceiling =
 *   round((49 - 13) / 49 × 100) = 73.
 *
 * Each check = ~2.04 points; citation slice = ~26.5 points combined.
 *
 * IDs use the same _aaivSlug values as the worker's FACTOR_META so any
 * downstream consumer that keys on check ID gets parity-faithful output.
 */
export const CITATION_CHECK_STUBS: ReadonlyArray<{
  id: string;
  title: string;
}> = [
  { id: "chatgpt-citation", title: "ChatGPT Citation" },
  { id: "claude-citation", title: "Claude Citation" },
  { id: "perplexity-citation", title: "Perplexity Citation" },
  { id: "perplexity-source", title: "Perplexity Source Link" },
  { id: "multi-provider", title: "Multi-Provider Coverage" },
  { id: "chatgpt-competitors", title: "ChatGPT Competitors" },
  { id: "ai-query-coverage", title: "AI Query Coverage" },
  { id: "brand-accuracy", title: "Brand Name Accuracy" },
  { id: "service-description", title: "Service Description Accuracy" },
  { id: "ai-sentiment", title: "AI Sentiment" },
  { id: "ai-readiness-composite", title: "AI Readiness Score" },
  { id: "ai-citation-test", title: "AI Citation Test" },
  { id: "ai-readiness-estimate", title: "AI Readiness Estimate" },
];

/**
 * Build the 13 skipped citation checks for free-mode local audits.
 * The "skipped" status keeps them in the denominator (≈26.5pt of the 100pt
 * AEO score) without counting toward passes — enforcing the 73/100 ceiling
 * mathematically rather than via a soft display cap.
 */
export function citationCheckStubs(): AuditCheck[] {
  return CITATION_CHECK_STUBS.map((c) => ({
    id: c.id,
    title: c.title,
    category: "AEO" as const,
    status: "skipped" as const,
    message:
      "Live AI citation probe — requires BYOK (apex keys set openai|anthropic|perplexity) or a Radar token.",
  }));
}
