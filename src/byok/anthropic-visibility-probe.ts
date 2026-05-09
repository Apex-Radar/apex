// Anthropic (Claude) BYOK probe wired into `apex visibility`.
// Mirrors openai-visibility-probe.ts shape so the visibility handler can
// fan out across all three providers in parallel.

import type { AuditCheck, CheckStatus } from "../radar/types.js";
import { estimateProbe } from "../core/cost/estimator.js";
import { appendLedger } from "../core/cost/ledger.js";

export interface AnthropicProbeResult {
  cited: boolean;
  mentioned: boolean;
  brandSpelledCorrectly: boolean;
  excerpt: string;
  estimatedUsd: number;
  query: string;
}

export async function runAnthropicProbe(args: {
  apiKey: string;
  query: string;
  brand: string;
  fetchImpl?: typeof fetch;
}): Promise<AnthropicProbeResult> {
  const fetchFn = args.fetchImpl ?? fetch;
  const r = await fetchFn("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": args.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: args.query }],
    }),
  });
  if (!r.ok) {
    throw new Error(`anthropic ${r.status}: ${await r.text()}`);
  }
  const j: any = await r.json();
  const text: string = j?.content?.[0]?.text ?? "";
  const lower = text.toLowerCase();
  const brandLower = args.brand.toLowerCase();

  const mentioned = lower.includes(brandLower);
  const hasUrl = /https?:\/\/[^\s)]+/i.test(text);
  const cited = mentioned && hasUrl;
  const brandSpelledCorrectly = text.includes(args.brand);

  const est = estimateProbe({
    provider: "anthropic",
    queries: 1,
    avgInputTokens: 60,
    avgOutputTokens: 350,
  });

  return {
    cited,
    mentioned,
    brandSpelledCorrectly,
    excerpt: text.slice(0, 280),
    estimatedUsd: est.estimatedUsd,
    query: args.query,
  };
}

/**
 * Convert Claude probe → graded checks. Fills:
 *   - claude-citation
 */
export function anthropicProbeToChecks(
  result: AnthropicProbeResult,
  brand: string,
): AuditCheck[] {
  const checks: AuditCheck[] = [];
  const status: CheckStatus = result.cited ? "pass" : result.mentioned ? "warn" : "fail";
  checks.push({
    id: "claude-citation",
    title: "Claude Citation",
    category: "AEO",
    status,
    message: result.cited
      ? `Claude cited ${brand} with a link for "${result.query}".`
      : result.mentioned
      ? `Claude mentioned ${brand} but did not link to it.`
      : `Claude did not mention ${brand} for "${result.query}".`,
  });
  return checks;
}

export async function logAnthropicProbeToLedger(
  result: AnthropicProbeResult,
  est: { inputTokens: number; outputTokens: number },
): Promise<void> {
  try {
    await appendLedger({
      ts: new Date().toISOString(),
      provider: "anthropic",
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
