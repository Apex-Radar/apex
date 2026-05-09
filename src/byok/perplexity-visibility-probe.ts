// Perplexity BYOK probe wired into `apex visibility`.
// Mirrors openai-visibility-probe.ts shape. Perplexity is the most
// citation-aware engine — it returns explicit source URLs, so we can
// fill both "perplexity-citation" AND "perplexity-source" slots.

import type { AuditCheck, CheckStatus } from "../radar/types.js";
import { estimateProbe } from "../core/cost/estimator.js";
import { appendLedger } from "../core/cost/ledger.js";

export interface PerplexityProbeResult {
  cited: boolean;
  mentioned: boolean;
  /** True if any source URL on the user's domain appears in the response. */
  sourceLinked: boolean;
  /** All source URLs returned by Perplexity. */
  sources: string[];
  excerpt: string;
  estimatedUsd: number;
  query: string;
}

export async function runPerplexityProbe(args: {
  apiKey: string;
  query: string;
  brand: string;
  domain?: string;
  fetchImpl?: typeof fetch;
}): Promise<PerplexityProbeResult> {
  const fetchFn = args.fetchImpl ?? fetch;
  const r = await fetchFn("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: args.query }],
      max_tokens: 500,
    }),
  });
  if (!r.ok) {
    throw new Error(`perplexity ${r.status}: ${await r.text()}`);
  }
  const j: any = await r.json();
  const text: string = j?.choices?.[0]?.message?.content ?? "";
  const sources: string[] = Array.isArray(j?.citations) ? j.citations : [];
  const lower = text.toLowerCase();
  const brandLower = args.brand.toLowerCase();

  const mentioned = lower.includes(brandLower);
  const hasUrl = /https?:\/\/[^\s)]+/i.test(text) || sources.length > 0;
  const cited = mentioned && hasUrl;

  // sourceLinked: any of Perplexity's source URLs land on the user's domain.
  const domainLower = (args.domain ?? "").toLowerCase();
  const sourceLinked =
    !!domainLower &&
    sources.some((u) => u.toLowerCase().includes(domainLower));

  const est = estimateProbe({
    provider: "perplexity",
    queries: 1,
    avgInputTokens: 60,
    avgOutputTokens: 350,
  });

  return {
    cited,
    mentioned,
    sourceLinked,
    sources,
    excerpt: text.slice(0, 280),
    estimatedUsd: est.estimatedUsd,
    query: args.query,
  };
}

/**
 * Convert Perplexity probe → graded checks. Fills:
 *   - perplexity-citation
 *   - perplexity-source
 */
export function perplexityProbeToChecks(
  result: PerplexityProbeResult,
  brand: string,
): AuditCheck[] {
  const checks: AuditCheck[] = [];

  const citStatus: CheckStatus = result.cited ? "pass" : result.mentioned ? "warn" : "fail";
  checks.push({
    id: "perplexity-citation",
    title: "Perplexity Citation",
    category: "AEO",
    status: citStatus,
    message: result.cited
      ? `Perplexity cited ${brand} with sources for "${result.query}".`
      : result.mentioned
      ? `Perplexity mentioned ${brand} but did not link to it.`
      : `Perplexity did not mention ${brand} for "${result.query}".`,
  });

  checks.push({
    id: "perplexity-source",
    title: "Perplexity Source Link",
    category: "AEO",
    status: result.sourceLinked
      ? "pass"
      : result.cited
      ? "warn"
      : "fail",
    message: result.sourceLinked
      ? `Perplexity linked directly to your domain in its sources.`
      : result.cited
      ? `Perplexity cited ${brand} but linked to other domains, not yours.`
      : `Could not assess (brand not cited).`,
  });

  return checks;
}

export async function logPerplexityProbeToLedger(
  result: PerplexityProbeResult,
  est: { inputTokens: number; outputTokens: number },
): Promise<void> {
  try {
    await appendLedger({
      ts: new Date().toISOString(),
      provider: "perplexity",
      operation: "visibility-inline-probe",
      inputTokens: est.inputTokens,
      outputTokens: est.outputTokens,
      estimatedUsd: result.estimatedUsd,
      notes: result.query.slice(0, 80),
    });
  } catch {
    /* swallow */
  }
}
