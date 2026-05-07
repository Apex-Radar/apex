import type { AuditCheck, AuditResult } from "../radar/types.js";
import { aeoBotAccessChecks } from "./checks/aeo-bot-access.js";
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
 * Only `pass` increments the numerator. `warn` and `fail` are 0.
 */
function scoreFor(checks: AuditCheck[], category: "SEO" | "AEO"): number {
  const subset = checks.filter((c) => c.category === category);
  if (subset.length === 0) return 0;
  const passCount = subset.filter((c) => c.status === "pass").length;
  return Math.round((passCount / subset.length) * 100);
}

/**
 * Readiness score (AAIV) — parity-faithful port of `buildAaivOutput()` in
 * `apex-worker-do/src/checks/aeo-checks.js` lines 76-84.
 *
 * Different from SEO/AEO scoring: `warn` counts as half-pass.
 *   readinessScore = round(((pass + warn * 0.5) / total) * 100)
 */
function readinessScoreFromAeo(checks: AuditCheck[]): { score: number; label: string } {
  const aeoChecks = checks.filter((c) => c.category === "AEO");
  // Citation factors are excluded from readiness — they go in the citation bucket
  // in the full implementation. In local mode (no API) we emit no citation checks,
  // so the AEO subset IS the readiness factor set.
  const passes = aeoChecks.filter((f) => f.status === "pass").length;
  const warns = aeoChecks.filter((f) => f.status === "warn").length;
  const total = aeoChecks.length;
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

export async function runLocalAudit(
  input: LocalAuditInput,
): Promise<AuditResult> {
  const ctx = await buildSiteContext(input);

  const checks: AuditCheck[] = [
    // SEO checks (~45 portable, matching free audit names exactly)
    ...contentChecks(ctx),
    ...seoFoundationsChecks(ctx),
    ...seoImageChecks(ctx),
    ...seoLinkChecks(ctx),
    ...seoStructureChecks(ctx),
    ...seoRobotsSitemapChecks(ctx),
    // AEO checks (~38 portable, matching free audit names exactly)
    ...aeoSchemaChecks(ctx),
    ...aeoBotAccessChecks(ctx),
    ...aeoContentChecks(ctx),
  ];

  const seoScore = scoreFor(checks, "SEO");
  const aeoScore = scoreFor(checks, "AEO");
  const overallScore = Math.round((seoScore + aeoScore) / 2);
  const { score: readinessScore, label: readinessLabel } =
    readinessScoreFromAeo(checks);

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
  };
}

export type { LocalAuditInput };
