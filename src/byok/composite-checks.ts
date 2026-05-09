// Composite citation checks — fill slots that depend on signals across
// multiple BYOK providers. These slots are only meaningful when ≥2
// providers ran probes; otherwise they stay `skipped`.

import type { AuditCheck } from "../radar/types.js";
import type { OpenAiProbeResult } from "./openai-visibility-probe.js";
import type { AnthropicProbeResult } from "./anthropic-visibility-probe.js";
import type { PerplexityProbeResult } from "./perplexity-visibility-probe.js";

export interface ProbeBundle {
  openai?: OpenAiProbeResult;
  anthropic?: AnthropicProbeResult;
  perplexity?: PerplexityProbeResult;
}

/**
 * Build the composite check slots:
 *   - multi-provider:           ≥2 engines cited / ≥1 mentioned / none
 *   - ai-query-coverage:        share of providers that mentioned brand
 *   - ai-citation-test:         aggregate cited result (any engine cited)
 *   - ai-readiness-composite:   weighted citation score
 *   - ai-readiness-estimate:    same, descriptive
 */
export function compositeChecks(bundle: ProbeBundle, brand: string): AuditCheck[] {
  const present = [
    bundle.openai,
    bundle.anthropic,
    bundle.perplexity,
  ].filter(Boolean) as Array<{ cited: boolean; mentioned: boolean }>;

  if (present.length < 2) {
    // Composite slots need ≥2 engines to be meaningful. Stays skipped.
    return [];
  }

  const cited = present.filter((p) => p.cited).length;
  const mentioned = present.filter((p) => p.mentioned).length;
  const total = present.length;

  const checks: AuditCheck[] = [];

  // multi-provider
  checks.push({
    id: "multi-provider",
    title: "Multi-Provider Coverage",
    category: "AEO",
    status: cited >= 2 ? "pass" : cited === 1 ? "warn" : mentioned >= 1 ? "warn" : "fail",
    message:
      cited >= 2
        ? `${cited} of ${total} engines cited ${brand} with links.`
        : cited === 1
        ? `Only 1 of ${total} engines cited ${brand}; others mentioned but did not link.`
        : mentioned >= 1
        ? `${mentioned} of ${total} engines mentioned ${brand}; none linked.`
        : `No engine mentioned ${brand}.`,
  });

  // ai-query-coverage
  const coverPct = Math.round((mentioned / total) * 100);
  checks.push({
    id: "ai-query-coverage",
    title: "AI Query Coverage",
    category: "AEO",
    status: coverPct >= 67 ? "pass" : coverPct >= 33 ? "warn" : "fail",
    message: `${mentioned} of ${total} engines surfaced ${brand} (${coverPct}% coverage).`,
  });

  // ai-citation-test
  checks.push({
    id: "ai-citation-test",
    title: "AI Citation Test",
    category: "AEO",
    status: cited >= 1 ? "pass" : "fail",
    message:
      cited >= 1
        ? `At least one AI engine cited ${brand} with a link.`
        : `No AI engine cited ${brand} with a link in this scan.`,
  });

  // ai-readiness-composite
  // Weighted: cited = 1.0, mentioned-not-cited = 0.5, absent = 0.0
  const weighted = present.reduce(
    (sum, p) => sum + (p.cited ? 1 : p.mentioned ? 0.5 : 0),
    0,
  );
  const composite = Math.round((weighted / total) * 100);
  checks.push({
    id: "ai-readiness-composite",
    title: "AI Readiness Score",
    category: "AEO",
    status: composite >= 75 ? "pass" : composite >= 50 ? "warn" : "fail",
    message: `Composite citation readiness across ${total} engines: ${composite}/100.`,
  });

  // ai-readiness-estimate
  checks.push({
    id: "ai-readiness-estimate",
    title: "AI Readiness Estimate",
    category: "AEO",
    status: composite >= 75 ? "pass" : composite >= 50 ? "warn" : "fail",
    message: `Estimated readiness: ${composite}% — based on direct probe results from ${total} configured engines.`,
  });

  return checks;
}
