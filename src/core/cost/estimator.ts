// Cheap, transparent cost estimator for BYOK ad-hoc probes and brief generation.
// Numbers are approximate — Apex shows them so users see the bill BEFORE running.

import type { ProviderId } from "../keys/manager.js";

export interface ModelRate {
  inputPer1k: number;   // USD
  outputPer1k: number;  // USD
}

export const DEFAULT_RATES: Partial<Record<ProviderId, ModelRate>> = {
  openai:     { inputPer1k: 0.0025, outputPer1k: 0.01   },
  anthropic:  { inputPer1k: 0.003,  outputPer1k: 0.015  },
  perplexity: { inputPer1k: 0.001,  outputPer1k: 0.001  },
  gemini:     { inputPer1k: 0.00125, outputPer1k: 0.005 },
  grok:       { inputPer1k: 0.005,  outputPer1k: 0.015  },
  deepseek:   { inputPer1k: 0.0003, outputPer1k: 0.0012 },
};

export interface ProbePlan {
  provider: ProviderId;
  queries: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}

export interface CostEstimate {
  provider: ProviderId;
  queries: number;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
}

export function estimateProbe(plan: ProbePlan, rates: Partial<Record<ProviderId, ModelRate>> = DEFAULT_RATES): CostEstimate {
  const r = rates[plan.provider] ?? { inputPer1k: 0, outputPer1k: 0 };
  const inputTokens = plan.queries * plan.avgInputTokens;
  const outputTokens = plan.queries * plan.avgOutputTokens;
  const usd = (inputTokens / 1000) * r.inputPer1k + (outputTokens / 1000) * r.outputPer1k;
  return {
    provider: plan.provider,
    queries: plan.queries,
    inputTokens,
    outputTokens,
    estimatedUsd: Number(usd.toFixed(4)),
  };
}

export function estimateMany(plans: ProbePlan[]): { rows: CostEstimate[]; totalUsd: number } {
  const rows = plans.map((p) => estimateProbe(p));
  const totalUsd = Number(rows.reduce((s, r) => s + r.estimatedUsd, 0).toFixed(4));
  return { rows, totalUsd };
}
