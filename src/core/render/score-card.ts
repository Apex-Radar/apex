// Pretty terminal renderer for AAIV + AEO posture. No deps.
// Reads the unified AuditResult shape (source: "radar" | "local").
//
// v0.1.1 — comprehensive output: shows all failures + warnings grouped by
// category, with counts and Radar upsell. Free CLI = full diagnosis,
// Radar mode = continuous monitoring + AI citation probes.

import type { AuditCheck, AuditResult, AuditWrapper, AivResult } from "../../radar/types.js";

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function band(n: number): string {
  if (n >= 80) return GREEN;
  if (n >= 60) return YELLOW;
  return RED;
}

function statusGlyph(status: string): string {
  if (status === "pass") return `${GREEN}✓${RESET}`;
  if (status === "warn") return `${YELLOW}⚠${RESET}`;
  return `${RED}✗${RESET}`;
}

function bucketByCategory(checks: AuditCheck[], status: "fail" | "warn"): { aeo: AuditCheck[]; seo: AuditCheck[] } {
  const filtered = checks
    .filter((c) => c.status === status)
    .sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0));
  return {
    aeo: filtered.filter((c) => c.category === "AEO"),
    seo: filtered.filter((c) => c.category === "SEO"),
  };
}

function renderCheckBlock(checks: AuditCheck[], glyph: string): string[] {
  return checks.map((c) => {
    const impact = c.impact !== undefined ? ` ${DIM}(impact ${c.impact})${RESET}` : "";
    const title = `${BOLD}${c.title}${RESET}`;
    return `  ${glyph} [${c.category}] ${title}${impact}\n      ${DIM}${c.message}${RESET}`;
  });
}

/**
 * Accepts either the bare AuditResult or the {reportId, createdAt, result} wrapper.
 */
export function renderScoreCard(input: AuditResult | AuditWrapper): string {
  const audit: AuditResult = (input as AuditWrapper).result ?? (input as AuditResult);
  const wrapper = (input as AuditWrapper).result ? (input as AuditWrapper) : null;

  const lines: string[] = [];
  lines.push(`${BOLD}Apex — Audit posture${RESET}`);
  const when = wrapper ? new Date(wrapper.createdAt).toISOString() : "—";
  const src = audit.source === "local" ? "local" : "radar";
  lines.push(`${DIM}${audit.url} · ${when} · ${src}${RESET}`);
  lines.push("");

  // Score line — front-and-center: Overall · SEO · AEO · AAIV (when available)
  //
  // AEO display is mode-aware:
  //   • Free mode (audit.aeoCeiling set): "AEO 54/73 portable" — the visible
  //     /73 ceiling makes the citation-slice gap unmissable. Color-banded
  //     against the ceiling (54/73 ≈ 74%) so a maxed-out free user gets green.
  //   • BYOK / Radar (no aeoCeiling): standard "AEO X" out of /100.
  //
  // Mode switch is data-driven, NEVER inferred from check statuses or string
  // templating. If aeoCeiling is undefined, we render the /100 form. Period.
  const isFreeCapped = typeof audit.aeoCeiling === "number";
  const aeoSegment = isFreeCapped
    ? (() => {
        const ceiling = audit.aeoCeiling as number;
        const banded = ceiling > 0
          ? band(Math.round((audit.aeoScore / ceiling) * 100))
          : band(audit.aeoScore);
        return `    AEO ${banded}${audit.aeoScore}/${ceiling}${RESET} ${DIM}portable${RESET}`;
      })()
    : `    AEO ${band(audit.aeoScore)}${audit.aeoScore}${RESET}`;
  let scoreLine =
    `Overall  ${band(audit.overallScore)}${audit.overallScore}/100${RESET}` +
    `    SEO ${band(audit.seoScore)}${audit.seoScore}${RESET}` +
    aeoSegment;
  if (audit.readiness) {
    scoreLine += `    AAIV ${band(audit.readiness.score)}${audit.readiness.score}/100${RESET}`;
  }
  lines.push(scoreLine);

  // AAIV section
  if (audit.readiness) {
    lines.push("");
    lines.push(`${BOLD}AAIV — Apex AI Visibility${RESET}`);
    lines.push(
      `  Are you understood? ${band(audit.readiness.score)}${audit.readiness.score}/100${RESET}` +
        `  ${DIM}${audit.readiness.label}${RESET}`,
    );
    if (audit.citation) {
      if (audit.citation.state === "graded" && audit.citation.score !== null) {
        lines.push(`  Are you cited?      ${band(audit.citation.score)}${audit.citation.score}/100${RESET}`);
      } else if (audit.citation.state === "pending") {
        const dr = audit.citation.days_remaining;
        lines.push(`  Are you cited?      ${DIM}pending${dr !== null ? ` — ${dr}d remaining` : ""}${RESET}`);
      } else {
        lines.push(`  Are you cited?      ${DIM}local audit — no citation probe run${RESET}`);
      }
    }
  }

  if (audit.domainAgeContext) {
    lines.push("");
    lines.push(`${DIM}${audit.domainAgeContext}${RESET}`);
  }

  // Counts summary
  const total = audit.checks.length;
  const passes = audit.checks.filter((c) => c.status === "pass").length;
  const warns = audit.checks.filter((c) => c.status === "warn").length;
  const fails = audit.checks.filter((c) => c.status === "fail").length;
  const skipped = audit.checks.filter((c) => c.status === "skipped").length;
  lines.push("");
  const skippedSegment =
    skipped > 0 ? `  ${DIM}🔒 ${skipped} skipped${RESET}` : "";
  lines.push(
    `${BOLD}${total} checks${RESET}  ` +
      `${GREEN}✓ ${passes} pass${RESET}  ` +
      `${YELLOW}⚠ ${warns} warn${RESET}  ` +
      `${RED}✗ ${fails} fail${RESET}` +
      skippedSegment,
  );

  // Failing checks — grouped by category, AEO first
  const failures = bucketByCategory(audit.checks, "fail");
  if (failures.aeo.length > 0 || failures.seo.length > 0) {
    lines.push("");
    lines.push(`${BOLD}${RED}Failing — fix these first${RESET}`);
    if (failures.aeo.length > 0) {
      lines.push(...renderCheckBlock(failures.aeo, statusGlyph("fail")));
    }
    if (failures.seo.length > 0) {
      lines.push(...renderCheckBlock(failures.seo, statusGlyph("fail")));
    }
  }

  // Warnings — grouped by category, AEO first
  const warnings = bucketByCategory(audit.checks, "warn");
  if (warnings.aeo.length > 0 || warnings.seo.length > 0) {
    lines.push("");
    lines.push(`${BOLD}${YELLOW}Worth fixing — opportunities${RESET}`);
    if (warnings.aeo.length > 0) {
      lines.push(...renderCheckBlock(warnings.aeo, statusGlyph("warn")));
    }
    if (warnings.seo.length > 0) {
      lines.push(...renderCheckBlock(warnings.seo, statusGlyph("warn")));
    }
  }

  // Closing line + Radar upsell
  lines.push("");
  lines.push(`${DIM}Move AAIV first. AEO compounds after.${RESET}`);
  if (audit.source === "local") {
    if (isFreeCapped) {
      const ceiling = audit.aeoCeiling as number;
      const citationPoints = 100 - ceiling;
      lines.push(
        `${DIM}This is your score on what we can check from your site's HTML.${RESET}`,
      );
      lines.push(
        `${DIM}The remaining ${citationPoints} points come from live AI citation checks: whether ChatGPT, Claude, and Perplexity actually mention you.${RESET}`,
      );
      lines.push(
        `${DIM}To grade those, run ${RESET}${BOLD}apex keys set openai|anthropic|perplexity${RESET}${DIM} (use your own AI key) or set a Radar token via ${RESET}${BOLD}apex connect${RESET}${DIM}.${RESET}`,
      );
    } else {
      lines.push(
        `${DIM}BYOK mode active. AEO is graded against the full 100-point scale. Run ${RESET}${BOLD}apex citation "<query>"${RESET}${DIM} for live engine probes.${RESET}`,
      );
    }
  } else {
    lines.push(
      `${DIM}Next: ${RESET}${BOLD}apex fix <fixer-id> --dry-run${RESET}${DIM} to start closing the top fails. ${RESET}` +
        `${DIM}Ranked Answer Gap rows (${RESET}${BOLD}apex gaps${RESET}${DIM}) require the Radar Answer Gap module — separate from AIV scans.${RESET}`,
    );
  }
  lines.push(`${DIM}Run with ${BOLD}--json${RESET}${DIM} to get the full check list as machine-readable output.${RESET}`);
  return lines.join("\n");
}

export function renderAiv(aiv: AivResult): string {
  const lines: string[] = [];
  lines.push(`${BOLD}AI Visibility — ${aiv.clientBrandName}${RESET}`);
  lines.push(`${DIM}${aiv.clientWebsiteUrl} · ${aiv.scannedAt}${RESET}`);
  lines.push("");
  const delta = aiv.deltaScore >= 0 ? `+${aiv.deltaScore.toFixed(1)}` : aiv.deltaScore.toFixed(1);
  lines.push(`Visibility  ${BOLD}${aiv.visibilityScore.toFixed(1)}/10${RESET}  ${DIM}(prev ${aiv.previousScore.toFixed(1)}, Δ ${delta})${RESET}`);
  lines.push(`Mentions    ${aiv.totalMentions} across ${aiv.totalQueriesRun} probes`);
  if (aiv.unmentionedEngines.length) {
    lines.push(`Missing in  ${aiv.unmentionedEngines.join(", ")}`);
  }
  lines.push("");
  lines.push(`${BOLD}Per engine${RESET}`);
  for (const e of aiv.perEngineScores) {
    const mark = e.cited ? "✓" : e.mentioned ? "~" : "·";
    lines.push(`  ${mark} ${e.engine.padEnd(11)} ${band(e.score * 10)}${e.score.toFixed(1)}/10${RESET}`);
  }
  if (aiv.fixesThisWeek.length) {
    lines.push("");
    lines.push(`${BOLD}Fixes this week${RESET}`);
    for (const f of aiv.fixesThisWeek.slice(0, 5)) lines.push(`  • ${f}`);
  }
  return lines.join("\n");
}
