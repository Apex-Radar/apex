export { RadarAuditClient } from "./radar/audit-client.js";
export { RadarAivClient } from "./radar/aiv-client.js";
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
  AivResult,
  AivWrapper,
  AivConfig,
  AivTrendPoint,
  AnswerGapRow,
  AnswerGapResponse,
  CompetitorScore,
  EngineId,
  MentionDetail,
  PerEngineScore,
  QueryResult,
  VerificationStatus,
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

export { rankGaps, specForRow, planBriefs } from "./workflow/answer-gap.js";
export type { BriefSpec } from "./workflow/answer-gap.js";

export { compareScans, renderProve } from "./workflow/prove.js";
export type { ProveDelta } from "./workflow/prove.js";

export const APEX_VERSION = "0.1.0";
