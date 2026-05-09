// Shared types — kept under src/radar/types.ts for historical reasons
// (the file was named before "Radar mode" was retired in v0.2.0). The
// types describe AAIV / AEO scoring shapes used by both the local
// Cheerio audit and BYOK probes.
export type {
  AuditCheck,
  AuditResult,
  AuditWrapper,
  Readiness,
  ReadinessFactor,
  CitationStatus,
  AiCitation,
  AeoReadiness,
  AeoReadinessSubpillars,
  DomainInfo,
  CheckCategory,
  CheckStatus,
} from "./radar/types.js";

export { keys, KeyManager } from "./core/keys/manager.js";
export type { ProviderId } from "./core/keys/manager.js";

export { estimateProbe, estimateMany, DEFAULT_RATES } from "./core/cost/estimator.js";
export type { ProbePlan, CostEstimate, ModelRate } from "./core/cost/estimator.js";

export { appendLedger, readLedger, summarize } from "./core/cost/ledger.js";
export type { LedgerEntry, LedgerSummary } from "./core/cost/ledger.js";

export { detectFramework } from "./core/framework/detect.js";
export type { Framework, DetectionResult } from "./core/framework/detect.js";

export { renderScoreCard, renderAiv } from "./core/render/score-card.js";

// Injected at build time by tsup's `define` from package.json. See tsup.config.ts.
// Falls back to "0.0.0-dev" when running un-built (e.g. tsx / vitest dev mode).
declare const __APEX_VERSION__: string;
export const APEX_VERSION: string =
  typeof __APEX_VERSION__ !== "undefined" ? __APEX_VERSION__ : "0.0.0-dev";
