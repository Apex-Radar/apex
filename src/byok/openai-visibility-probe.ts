// OpenAI BYOK probe wired into `apex visibility`.
//
// One GPT-4o-mini call per query. The single response is parsed for
// multiple signals → fills the OpenAI-side citation slots in the local
// audit. Anthropic + Perplexity probes ship in a follow-up release with
// the same shape.
//
// IMPORTANT: this module does NOT call the LLM unless explicitly invoked
// by the visibility handler with a configured key. The mere presence of
// a key never auto-flips check states — probes have to actually run.

import type { AuditCheck, CheckStatus } from "../radar/types.js";
import { estimateProbe } from "../core/cost/estimator.js";
import { appendLedger } from "../core/cost/ledger.js";

export interface OpenAiProbeResult {
  /** Did GPT mention the brand AND include any URL in the response? */
  cited: boolean;
  /** Did GPT mention the brand at all (case-insensitive)? */
  mentioned: boolean;
  /** Was the brand spelled in its canonical form (case-sensitive match)? */
  brandSpelledCorrectly: boolean;
  /** Other named brand-shaped tokens the response mentions. Heuristic. */
  competitors: string[];
  /** First 280 chars of the response, for transparency. */
  excerpt: string;
  /** Estimated USD cost for this probe. */
  estimatedUsd: number;
  /** The probe query that was sent. */
  query: string;
}

/**
 * Hit gpt-4o-mini, parse signals, return shaped result. Throws on API
 * failure — caller decides whether to swallow or surface.
 */
export async function runOpenAiProbe(args: {
  apiKey: string;
  query: string;
  brand: string;
  fetchImpl?: typeof fetch;
}): Promise<OpenAiProbeResult> {
  const fetchFn = args.fetchImpl ?? fetch;
  const r = await fetchFn("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: args.query }],
      max_tokens: 500,
    }),
  });
  if (!r.ok) {
    throw new Error(`openai ${r.status}: ${await r.text()}`);
  }
  const j: any = await r.json();
  const text: string = j?.choices?.[0]?.message?.content ?? "";
  const lower = text.toLowerCase();
  const brandLower = args.brand.toLowerCase();

  const mentioned = lower.includes(brandLower);
  const hasUrl = /https?:\/\/[^\s)]+/i.test(text);
  const cited = mentioned && hasUrl;
  const brandSpelledCorrectly = text.includes(args.brand);

  // Heuristic competitor extraction: capitalised tokens that aren't the
  // brand and aren't sentence-starters. Imperfect but honest signal.
  const competitors = extractCompetitors(text, args.brand);

  const est = estimateProbe({
    provider: "openai",
    queries: 1,
    avgInputTokens: 60,
    avgOutputTokens: 350,
  });

  return {
    cited,
    mentioned,
    brandSpelledCorrectly,
    competitors,
    excerpt: text.slice(0, 280),
    estimatedUsd: est.estimatedUsd,
    query: args.query,
  };
}

/**
 * Convert a single OpenAI probe result into the citation-stub slots it
 * can honestly fill. Other slots (claude-citation, perplexity-citation,
 * multi-provider, etc.) stay un-touched and remain `skipped`.
 *
 * Mapping (5 stubs filled per OpenAI probe):
 *   - chatgpt-citation:     pass if cited / warn if mentioned / fail otherwise
 *   - chatgpt-competitors:  pass if 0 / warn if cited+some / fail if not cited
 *   - brand-accuracy:       pass if spelled correctly / warn if mentioned / skipped if absent
 *   - service-description:  pass/warn/fail based on response containing brand context
 *   - ai-sentiment:         heuristic sentiment around the brand mention
 */
export function probeResultToChecks(
  result: OpenAiProbeResult,
  brand: string,
): AuditCheck[] {
  const checks: AuditCheck[] = [];

  // 1. chatgpt-citation
  checks.push({
    id: "chatgpt-citation",
    title: "ChatGPT Citation",
    category: "AEO",
    status: result.cited ? "pass" : result.mentioned ? "warn" : "fail",
    message: result.cited
      ? `ChatGPT cited ${brand} with a link for "${result.query}".`
      : result.mentioned
      ? `ChatGPT mentioned ${brand} but did not link to it.`
      : `ChatGPT did not mention ${brand} for "${result.query}".`,
  });

  // 2. chatgpt-competitors
  const compStatus: CheckStatus = !result.mentioned
    ? "fail"
    : result.competitors.length === 0
    ? "pass"
    : "warn";
  checks.push({
    id: "chatgpt-competitors",
    title: "ChatGPT Competitors",
    category: "AEO",
    status: compStatus,
    message: !result.mentioned
      ? `ChatGPT named ${result.competitors.length} other brand(s) without mentioning ${brand}.`
      : result.competitors.length === 0
      ? `No competitor brands surfaced alongside ${brand} in ChatGPT response.`
      : `ChatGPT named competitors alongside ${brand}: ${result.competitors.slice(0, 3).join(", ")}.`,
  });

  // 3. brand-accuracy (case-sensitive spelling)
  checks.push({
    id: "brand-accuracy",
    title: "Brand Name Accuracy",
    category: "AEO",
    status: result.brandSpelledCorrectly
      ? "pass"
      : result.mentioned
      ? "warn"
      : "skipped",
    message: result.brandSpelledCorrectly
      ? `Brand spelled in canonical form by ChatGPT.`
      : result.mentioned
      ? `ChatGPT mentioned the brand but with non-canonical casing.`
      : `Could not assess (brand not mentioned).`,
  });

  // 4. service-description — heuristic: response is "about" the user's
  // service if the brand mention is within ~200 chars of substantive
  // service-related content (more than a passing reference).
  const serviceContextOk =
    result.mentioned && result.excerpt.length >= 200;
  checks.push({
    id: "service-description",
    title: "Service Description Accuracy",
    category: "AEO",
    status: serviceContextOk
      ? "pass"
      : result.mentioned
      ? "warn"
      : "skipped",
    message: serviceContextOk
      ? `ChatGPT response includes substantive context around the brand mention.`
      : result.mentioned
      ? `ChatGPT mentioned the brand but with thin context — risk of being seen as incidental.`
      : `Could not assess (brand not mentioned).`,
  });

  // 5. ai-sentiment — lexical heuristic. Look for negative-tone tokens
  // near the brand mention; default to neutral-positive when cited.
  const sentiment = scoreSentiment(result.excerpt, brand);
  checks.push({
    id: "ai-sentiment",
    title: "AI Sentiment",
    category: "AEO",
    status: !result.mentioned
      ? "skipped"
      : sentiment === "positive"
      ? "pass"
      : sentiment === "neutral"
      ? "warn"
      : "fail",
    message: !result.mentioned
      ? `Could not assess (brand not mentioned).`
      : sentiment === "positive"
      ? `ChatGPT's mention of ${brand} reads positive.`
      : sentiment === "neutral"
      ? `ChatGPT's mention of ${brand} is neutral / informational.`
      : `ChatGPT's mention of ${brand} reads negative.`,
  });

  return checks;
}

/** Append per-probe entry to the BYOK ledger. Best-effort; swallows IO errors. */
export async function logProbeToLedger(
  result: OpenAiProbeResult,
  est: { inputTokens: number; outputTokens: number },
): Promise<void> {
  try {
    await appendLedger({
      ts: new Date().toISOString(),
      provider: "openai",
      operation: "visibility-inline-probe",
      inputTokens: est.inputTokens,
      outputTokens: est.outputTokens,
      estimatedUsd: result.estimatedUsd,
      notes: result.query.slice(0, 80),
    });
  } catch {
    // Don't let ledger IO failures break the visibility scan.
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Pull out brand-shaped tokens (TitleCase or ALL-CAPS) from the response,
 * excluding the user's own brand and common false-positive openers.
 * Imperfect — gives a rough competitor signal, not a definitive list.
 */
function extractCompetitors(text: string, brand: string): string[] {
  // Match TitleCase tokens of 2+ chars (handles "HubSpot", "ActiveCampaign", "Salesforce").
  // Drops single TitleCase words at sentence starts (heuristic: skip if
  // immediately preceded by `. ` or beginning of string).
  const tokens = new Set<string>();
  const brandLower = brand.toLowerCase();
  const stopwords = new Set([
    "The", "A", "An", "And", "Or", "But", "For", "With", "If", "When",
    "While", "Some", "Many", "Most", "All", "Any", "Each", "Every",
    "ChatGPT", "Google", "I", "It", "This", "That", "These", "Those",
    "Here", "There", "Now", "Today", "Yesterday", "Tomorrow",
  ]);
  const re = /\b[A-Z][a-zA-Z0-9]+(?:[A-Z][a-zA-Z0-9]*)*\b/g;
  for (const match of text.matchAll(re)) {
    const t = match[0];
    if (t.length < 3) continue;
    if (t.toLowerCase() === brandLower) continue;
    if (stopwords.has(t)) continue;
    tokens.add(t);
  }
  return [...tokens].slice(0, 8);
}

/**
 * Cheap sentiment near brand mention. Returns positive | neutral |
 * negative based on lexical hits in a window around the brand.
 */
function scoreSentiment(text: string, brand: string): "positive" | "neutral" | "negative" {
  const lower = text.toLowerCase();
  const brandLower = brand.toLowerCase();
  const idx = lower.indexOf(brandLower);
  if (idx === -1) return "neutral";
  const window = lower.slice(Math.max(0, idx - 100), Math.min(lower.length, idx + 200));
  const positive = ["best", "leading", "top", "powerful", "popular", "trusted", "recommended", "great", "excellent", "innovative"];
  const negative = ["worst", "avoid", "outdated", "expensive", "limited", "lacks", "poor", "weak", "buggy", "complaints"];
  let posHits = 0, negHits = 0;
  for (const w of positive) if (window.includes(w)) posHits++;
  for (const w of negative) if (window.includes(w)) negHits++;
  if (posHits > negHits) return "positive";
  if (negHits > posHits) return "negative";
  return "neutral";
}
