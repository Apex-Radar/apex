#!/usr/bin/env tsx
/**
 * parity.ts — compare CLI local-mode output to apex-worker-do free-audit output.
 *
 * Goal: drive the CLI's local-audit engine toward identical per-check status
 * agreement with the production "free audit" pipeline (apex-worker-do).
 *
 * Design contract:
 *   - Same single page, single fetch, same engine = same status (pass/warn/fail).
 *   - Aggregate scores will diverge structurally because the CLI's denominator
 *     is the portable subset (~92 checks) while the free audit denominator is
 *     the full set (~117). This is OK and expected. The KPI is per-check
 *     status agreement, not aggregate score equality.
 *
 * Output:
 *   - Side-by-side scores (free audit vs CLI)
 *   - Per-check status agreement count
 *   - Disagreements (with details — these are the bugs to fix)
 *   - "Only in free audit" list (the CLI port backlog)
 *   - "Only in CLI" list (informational — CLI may have extras)
 *
 * Usage:
 *   tsx tools/parity.ts                                       # default URL set
 *   tsx tools/parity.ts https://apexarchitects.xyz           # one URL
 *   tsx tools/parity.ts https://A.com https://B.com          # multiple
 *   VERBOSE=1 tsx tools/parity.ts                            # show port backlog detail
 */

import { runLocalAudit } from "../src/local-audit/index.js";

const FREE_AUDIT_HOST = process.env.PARITY_FREE_AUDIT_HOST ?? "https://worker.apexarchitects.xyz";

// ─── Types ─────────────────────────────────────────────────────────────────

interface FreeAuditCheck {
  category: "SEO" | "AEO";
  name: string;
  status: "pass" | "warn" | "fail";
  details?: string;
  fixable?: boolean;
  impact?: string;
  affectedPages?: number;
  totalPages?: number;
}

interface FreeAuditResult {
  url: string;
  seoScore: number;
  aeoScore: number;
  overallScore: number;
  checks: FreeAuditCheck[];
  totalChecks?: number;
  readiness?: { score: number; label: string; factors: any[] };
  citation?: { state: string; score: number | null };
  domainAgeDays?: number;
  domainAgeContext?: string;
}

interface ParityReport {
  url: string;
  freeAudit: { seo: number; aeo: number; overall: number; checkCount: number; readiness: number | null; citation: number | null };
  cliLocal: { seo: number; aeo: number; overall: number; checkCount: number; readiness: number | null };
  perCheck: {
    bothImplement: number;
    statusAgree: number;
    statusDisagree: { name: string; category: string; free: string; cli: string; freeDetails?: string; cliDetails?: string }[];
    onlyInFree: string[];
    onlyInCli: string[];
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[/\-_]/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFreeAudit(url: string): Promise<FreeAuditResult> {
  const endpoint = `${FREE_AUDIT_HOST}/api/audit-test?url=${encodeURIComponent(url)}`;
  const r = await fetch(endpoint, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`Free audit endpoint returned ${r.status} for ${url}`);
  const data = (await r.json()) as FreeAuditResult;
  if (!Array.isArray(data.checks)) {
    throw new Error(`Free audit response missing 'checks' array (keys: ${Object.keys(data).join(", ")})`);
  }
  return data;
}

async function compareEngines(url: string): Promise<ParityReport> {
  const [free, cli] = await Promise.all([
    fetchFreeAudit(url),
    runLocalAudit({ url }),
  ]);

  const freeMap = new Map<string, FreeAuditCheck>(
    free.checks.map((c) => [normalizeName(c.name), c]),
  );
  const cliMap = new Map<string, any>(
    cli.checks.map((c: any) => [normalizeName(c.title ?? c.name ?? ""), c]),
  );

  const bothNames: string[] = [];
  const disagreements: ParityReport["perCheck"]["statusDisagree"] = [];
  const onlyInFree: string[] = [];
  const onlyInCli: string[] = [];

  for (const [k, fc] of freeMap) {
    const cc = cliMap.get(k);
    if (cc) {
      bothNames.push(fc.name);
      if (fc.status !== cc.status) {
        disagreements.push({
          name: fc.name,
          category: fc.category,
          free: fc.status,
          cli: cc.status,
          freeDetails: fc.details?.slice(0, 100),
          cliDetails: (cc.message ?? cc.details)?.slice(0, 100),
        });
      }
    } else {
      onlyInFree.push(`[${fc.category}] ${fc.name}`);
    }
  }
  for (const [k, cc] of cliMap) {
    if (!freeMap.has(k)) {
      onlyInCli.push(`[${cc.category}] ${cc.title ?? cc.name ?? k}`);
    }
  }

  return {
    url,
    freeAudit: {
      seo: free.seoScore,
      aeo: free.aeoScore,
      overall: free.overallScore,
      checkCount: free.checks.length,
      readiness: free.readiness?.score ?? null,
      citation: free.citation?.score ?? null,
    },
    cliLocal: {
      seo: (cli as any).seoScore ?? 0,
      aeo: (cli as any).aeoScore ?? 0,
      overall: (cli as any).overallScore ?? 0,
      checkCount: cli.checks.length,
      readiness: (cli as any).readiness?.score ?? null,
    },
    perCheck: {
      bothImplement: bothNames.length,
      statusAgree: bothNames.length - disagreements.length,
      statusDisagree: disagreements,
      onlyInFree,
      onlyInCli,
    },
  };
}

// ─── Renderer ─────────────────────────────────────────────────────────────

function pad(n: number, w = 3): string {
  return String(n).padStart(w);
}

function renderReport(r: ParityReport, verbose: boolean): string {
  const lines: string[] = [];
  const bar = "═".repeat(72);
  lines.push("");
  lines.push(bar);
  lines.push(`  ${r.url}`);
  lines.push(bar);

  lines.push("");
  lines.push("  Scores                Free audit       CLI local        Δ");
  lines.push(
    `    SEO              ${pad(r.freeAudit.seo)}              ${pad(r.cliLocal.seo)}            ${
      r.cliLocal.seo - r.freeAudit.seo >= 0 ? "+" : ""
    }${r.cliLocal.seo - r.freeAudit.seo}`,
  );
  lines.push(
    `    AEO              ${pad(r.freeAudit.aeo)}              ${pad(r.cliLocal.aeo)}            ${
      r.cliLocal.aeo - r.freeAudit.aeo >= 0 ? "+" : ""
    }${r.cliLocal.aeo - r.freeAudit.aeo}`,
  );
  lines.push(
    `    Overall          ${pad(r.freeAudit.overall)}              ${pad(r.cliLocal.overall)}            ${
      r.cliLocal.overall - r.freeAudit.overall >= 0 ? "+" : ""
    }${r.cliLocal.overall - r.freeAudit.overall}`,
  );
  if (r.freeAudit.readiness !== null) {
    const diff = (r.cliLocal.readiness ?? 0) - r.freeAudit.readiness;
    lines.push(
      `    AAIV/readiness   ${pad(r.freeAudit.readiness)}              ${pad(r.cliLocal.readiness ?? 0)}            ${
        diff >= 0 ? "+" : ""
      }${diff}`,
    );
  }
  lines.push(`    Check count      ${pad(r.freeAudit.checkCount)}              ${pad(r.cliLocal.checkCount)}`);

  lines.push("");
  lines.push(`  Per-check parity (the real KPI)`);
  lines.push(`    Both engines implement:  ${r.perCheck.bothImplement}`);
  lines.push(
    `    Status agreement:        ${r.perCheck.statusAgree}/${r.perCheck.bothImplement} ` +
      `(${Math.round((r.perCheck.statusAgree / Math.max(1, r.perCheck.bothImplement)) * 100)}%)`,
  );
  lines.push(`    Status disagreement:     ${r.perCheck.statusDisagree.length}`);
  lines.push(`    Only in free audit:      ${r.perCheck.onlyInFree.length}  (← CLI port backlog)`);
  lines.push(`    Only in CLI:             ${r.perCheck.onlyInCli.length}`);

  if (r.perCheck.statusDisagree.length) {
    lines.push("");
    lines.push(`  Disagreements (these are bugs to fix):`);
    for (const d of r.perCheck.statusDisagree) {
      lines.push(`    [${d.category}] ${d.name.padEnd(36)}  free=${d.free.padEnd(4)} cli=${d.cli}`);
      if (verbose) {
        if (d.freeDetails) lines.push(`        free: ${d.freeDetails}`);
        if (d.cliDetails) lines.push(`        cli:  ${d.cliDetails}`);
      }
    }
  }

  if (verbose && r.perCheck.onlyInFree.length) {
    lines.push("");
    lines.push(`  Free-audit checks not yet in CLI (port backlog, ${r.perCheck.onlyInFree.length}):`);
    for (const n of r.perCheck.onlyInFree.slice(0, 50)) lines.push(`    - ${n}`);
    if (r.perCheck.onlyInFree.length > 50) {
      lines.push(`    ... and ${r.perCheck.onlyInFree.length - 50} more`);
    }
  }

  if (verbose && r.perCheck.onlyInCli.length) {
    lines.push("");
    lines.push(`  CLI-only checks (not in free audit, ${r.perCheck.onlyInCli.length}):`);
    for (const n of r.perCheck.onlyInCli) lines.push(`    - ${n}`);
  }

  return lines.join("\n");
}

// ─── Entry point ─────────────────────────────────────────────────────────

const DEFAULT_URLS = [
  "https://apexarchitects.xyz",
  "https://getapexradar.com",
  "https://gooseworks.ai",
  "https://example.com",
];

const argUrls = process.argv.slice(2);
const urls = argUrls.length ? argUrls : DEFAULT_URLS;
const verbose = Boolean(process.env.VERBOSE);

console.log(`Parity rig — CLI local mode vs apex-worker-do free audit (${FREE_AUDIT_HOST})`);
console.log(`URLs: ${urls.length}`);
if (!verbose) console.log(`Tip: VERBOSE=1 tsx tools/parity.ts  for port backlog + disagreement details`);

let totalAgree = 0;
let totalCompared = 0;
let totalBacklog = 0;

for (const url of urls) {
  try {
    const report = await compareEngines(url);
    console.log(renderReport(report, verbose));
    totalAgree += report.perCheck.statusAgree;
    totalCompared += report.perCheck.bothImplement;
    totalBacklog += report.perCheck.onlyInFree.length;
  } catch (err) {
    console.error(`\n  ERROR for ${url}: ${(err as Error).message}`);
  }
}

console.log("\n" + "═".repeat(72));
console.log("  AGGREGATE");
console.log("═".repeat(72));
console.log(`  Per-check status agreement (across all URLs): ${totalAgree}/${totalCompared} ` +
  `(${Math.round((totalAgree / Math.max(1, totalCompared)) * 100)}%)`);
console.log(`  Total port backlog references (sum across URLs): ${totalBacklog}`);
console.log("");
console.log("  KPI for v0.1.0 publish: per-check status agreement ≥ 95% on all default URLs.");
console.log("  Each ported check should bring agreement % up; each disagreement is a bug.");
