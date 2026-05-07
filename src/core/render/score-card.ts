// Pretty terminal renderer for AAIV + AEO posture. No deps.
// Reads the unified AuditResult shape (source: "radar" | "local").

import type { AuditResult, AuditWrapper, AivResult } from "../../radar/types.js";

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

  lines.push(
    `Overall  ${band(audit.overallScore)}${audit.overallScore}/100${RESET}` +
    `    SEO ${band(audit.seoScore)}${audit.seoScore}${RESET}` +
    `    AEO ${band(audit.aeoScore)}${audit.aeoScore}${RESET}`,
  );

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

  // Top failing checks by impact (descending numeric impact, AEO before SEO).
  const fails = audit.checks
    .filter((c) => c.status === "fail")
    .sort((a, b) => {
      const cat = (a.category === "AEO" ? 0 : 1) - (b.category === "AEO" ? 0 : 1);
      if (cat !== 0) return cat;
      return (b.impact ?? 0) - (a.impact ?? 0);
    })
    .slice(0, 5);

  if (fails.length) {
    lines.push("");
    lines.push(`${BOLD}Top fixes${RESET}`);
    for (const c of fails) {
      const tag = c.impact !== undefined ? ` ${DIM}(impact ${c.impact})${RESET}` : "";
      lines.push(`  ${RED}•${RESET} [${c.category}] ${c.title}${tag} — ${c.message}`);
    }
  }

  lines.push("");
  lines.push(`${DIM}Move AAIV first. AEO compounds after.${RESET}`);
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
