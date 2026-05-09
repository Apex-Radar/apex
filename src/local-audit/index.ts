import type { AuditCheck, AuditResult } from "../radar/types.js";
import { aeoBotAccessChecks } from "./checks/aeo-bot-access.js";
import {
  CITATION_CHECK_STUBS,
  citationCheckStubs,
} from "./checks/aeo-citation-stubs.js";
import { aeoContentChecks } from "./checks/aeo-content.js";
import { aeoSchemaChecks } from "./checks/aeo-schema.js";
import { contentChecks } from "./checks/content.js";
import { seoFoundationsChecks } from "./checks/seo-foundations.js";
import { seoImageChecks } from "./checks/seo-images.js";
import { seoLinkChecks } from "./checks/seo-links.js";
import { seoRobotsSitemapChecks } from "./checks/seo-robots-sitemap.js";
import { seoStructureChecks } from "./checks/seo-structure.js";
import { buildSiteContext } from "./fetch.js";
import type { LocalAuditInput } from "./types.js";

/**
 * SEO/AEO score formula — parity-faithful match to apex-worker-do/src/auditor.js:
 *   score = round((pass_count / total_in_category) * 100)
 *
 * Only `pass` increments the numerator. `warn`, `fail`, and `skipped` are 0.
 * Skipped checks REMAIN in the denominator — that's the entire point of the
 * skipped-citation-slice design: it enforces the free-mode AEO ceiling
 * mathematically rather than via a soft display cap.
 */
function scoreFor(checks: AuditCheck[], category: "SEO" | "AEO"): number {
  const subset = checks.filter((c) => c.category === category);
  if (subset.length === 0) return 0;
  const passCount = subset.filter((c) => c.status === "pass").length;
  return Math.round((passCount / subset.length) * 100);
}

/**
 * Readiness score (AAIV "Are you understood?") — parity-faithful port of
 * `buildAaivOutput()` in `apex-worker-do/src/checks/aeo-checks.js` lines 76-84.
 *
 * Different from SEO/AEO scoring: `warn` counts as half-pass.
 *   readinessScore = round(((pass + warn * 0.5) / total) * 100)
 *
 * Skipped citation checks are EXCLUDED from the readiness denominator —
 * readiness is the on-page-controllable axis ("what you've built"); citation
 * is the earned axis ("what you've earned"). They go in different buckets in
 * the worker (`citationFactors` vs `readinessFactors`); we mirror that here
 * by filtering out skipped before computing readiness so AAIV stays
 * parity-faithful with portal regardless of mode.
 */
function readinessScoreFromAeo(checks: AuditCheck[]): { score: number; label: string } {
  const readinessFactors = checks.filter(
    (c) => c.category === "AEO" && c.status !== "skipped",
  );
  const passes = readinessFactors.filter((f) => f.status === "pass").length;
  const warns = readinessFactors.filter((f) => f.status === "warn").length;
  const total = readinessFactors.length;
  const score =
    total > 0 ? Math.round(((passes + warns * 0.5) / total) * 100) : 0;
  const label =
    score >= 85
      ? "Strong foundation"
      : score >= 65
        ? "Good progress"
        : score >= 45
          ? "Needs work"
          : "Critical gaps";
  return { score, label };
}

/**
 * Compute the free-mode AEO ceiling from the actual check inventory.
 * Math: ((total - skipped) / total) × 100, rounded.
 *
 * For getapexradar.com: 49 AEO checks, 13 skipped → ceiling = 73.
 *
 * Computed dynamically (not hard-coded 73) so that if/when the worker
 * inventory shifts (a citation check added, a portable check ported), the
 * ceiling tracks reality automatically.
 */
function computeAeoCeiling(checks: AuditCheck[]): number {
  const aeoChecks = checks.filter((c) => c.category === "AEO");
  if (aeoChecks.length === 0) return 100;
  const skipped = aeoChecks.filter((c) => c.status === "skipped").length;
  if (skipped === 0) return 100;
  return Math.round(((aeoChecks.length - skipped) / aeoChecks.length) * 100);
}

export interface LocalAuditOptions {
  /**
   * Forward-compat hook for when inline citation probes are wired into the
   * visibility flow. When `true`, the caller is responsible for actually
   * running probes against OpenAI/Anthropic/Perplexity AND injecting graded
   * citation results — this audit will then SKIP emitting the placeholder
   * skipped-citation stubs (since real graded checks take their place).
   *
   * Default `false`: emit the 13 citation stubs as `skipped` so the AEO
   * denominator stays parity-faithful and the ceiling math holds.
   *
   * IMPORTANT: configuring an LLM API key is NOT sufficient justification
   * to set this `true`. The flag must reflect that probes have actually
   * run — otherwise we silently shrink the denominator and reintroduce the
   * exact dishonesty this design was built to prevent. The handler must
   * confirm probes ran successfully before passing `true`.
   */
  inlineCitationProbes?: boolean;
}

export async function runLocalAudit(
  input: LocalAuditInput,
  options: LocalAuditOptions = {},
): Promise<AuditResult> {
  const ctx = await buildSiteContext(input);
  const skipStubs = options.inlineCitationProbes === true;

  const checks: AuditCheck[] = [
    // SEO checks (~45 portable, matching free audit names exactly)
    ...contentChecks(ctx),
    ...seoFoundationsChecks(ctx),
    ...seoImageChecks(ctx),
    ...seoLinkChecks(ctx),
    ...seoStructureChecks(ctx),
    ...seoRobotsSitemapChecks(ctx),
    // AEO checks (~36 portable, matching free audit names exactly)
    ...aeoSchemaChecks(ctx),
    ...aeoBotAccessChecks(ctx),
    ...aeoContentChecks(ctx),
    // Citation slice — 13 checks emitted as `skipped` to keep the AEO
    // denominator honest. Skipped only when the caller confirms inline
    // probes have actually run and injected graded versions in their place.
    ...(skipStubs ? [] : citationCheckStubs()),
  ];

  const seoScore = scoreFor(checks, "SEO");
  const aeoScore = scoreFor(checks, "AEO");
  const overallScore = Math.round((seoScore + aeoScore) / 2);
  const { score: readinessScore, label: readinessLabel } =
    readinessScoreFromAeo(checks);

  // The aeoCeiling is data-driven: present when ANY AEO check is `skipped`,
  // absent when all are graded. The renderer uses this signal alone to
  // decide between "AEO X/Y portable" and "AEO X/100" — no inference, no
  // string templating, no key-state lookups. The ceiling tracks reality of
  // grading, not user intent.
  const aeoCeiling = computeAeoCeiling(checks);
  const includeCeiling = aeoCeiling < 100;

  return {
    url: input.url,
    overallScore,
    seoScore,
    aeoScore,
    checks,
    readiness: {
      score: readinessScore,
      label: readinessLabel,
      factors: [],
    },
    citation: {
      // Local mode never probes AI engines. State is `unknown` (vs Radar's
      // `pending` for young domains or `graded` for established).
      state: "unknown",
      score: null,
      days_remaining: null,
    },
    aiCitation: {
      chatgptCited: false,
      perplexityCited: false,
    },
    source: "local",
    ...(includeCeiling ? { aeoCeiling } : {}),
  };
}

/** Re-export the canonical citation stub list for tests / parity rigs. */
export { CITATION_CHECK_STUBS };

export type { LocalAuditInput };

/**
 * Replace skipped citation stubs with graded versions from BYOK probes,
 * then recompute aeoScore + overallScore + aeoCeiling + readinessScore so
 * the result reflects the new check states honestly.
 *
 * Stubs are matched by `id` — any graded check whose id matches an
 * existing stub overwrites that stub. Graded checks with new ids are
 * appended (raises the denominator). Skipped stubs without a graded
 * counterpart stay skipped (keeps the denominator honest at 49 AEO).
 *
 * Mutates `audit` in place AND returns it for ergonomic chaining.
 */
export function applyInlineProbeResults(
  audit: AuditResult,
  graded: AuditCheck[],
): AuditResult {
  if (!graded.length) return audit;
  const byId = new Map<string, AuditCheck>(graded.map((c) => [c.id, c]));
  const next: AuditCheck[] = [];
  const seen = new Set<string>();
  for (const c of audit.checks) {
    const replacement = byId.get(c.id);
    if (replacement) {
      next.push(replacement);
      seen.add(c.id);
    } else {
      next.push(c);
    }
  }
  // Any graded check whose id wasn't already in the result gets appended.
  for (const g of graded) {
    if (!seen.has(g.id)) next.push(g);
  }
  audit.checks = next;
  audit.seoScore = scoreFor(next, "SEO");
  audit.aeoScore = scoreFor(next, "AEO");
  audit.overallScore = Math.round((audit.seoScore + audit.aeoScore) / 2);
  const { score: rs, label: rl } = readinessScoreFromAeo(next);
  audit.readiness.score = rs;
  audit.readiness.label = rl;
  const newCeiling = computeAeoCeiling(next);
  if (newCeiling >= 100) {
    delete (audit as Partial<AuditResult>).aeoCeiling;
  } else {
    audit.aeoCeiling = newCeiling;
  }
  return audit;
}
