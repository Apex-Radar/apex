// Keep all existing exports, add `source` discriminator + "unknown" citation state.

export type CheckStatus = "pass" | "warn" | "fail" | "skipped";
export type CheckCategory = "SEO" | "AEO";

export interface AuditCheck {
  id: string;
  title: string;
  category: CheckCategory;
  status: CheckStatus;
  message: string;
  /** Optional 0-10 impact score; AEO checks include it, SEO checks don't. */
  impact?: number;
}

export interface ReadinessFactor {
  id: string;
  label: string;
  score: number;
  weight?: number;
}

export interface Readiness {
  score: number;
  label: string;
  factors: ReadinessFactor[];
}

export interface CitationStatus {
  /** "graded" = scored; "pending" = waiting; "unknown" = local audit (no probe). */
  state: "graded" | "pending" | "unknown";
  score: number | null;
  days_remaining: number | null;
}

export interface AiCitation {
  chatgptCited: boolean;
  perplexityCited: boolean;
}

export interface AuditResult {
  url: string;
  overallScore: number;
  seoScore: number;
  aeoScore: number;
  checks: AuditCheck[];
  readiness: Readiness;
  citation: CitationStatus;
  aiCitation: AiCitation;
  domainAgeDays?: number;
  domainAgeContext?: string;
  /** "radar" = enriched by Apex Radar; "local" = computed in-skill. */
  source: "radar" | "local";
  /**
   * Free-mode AEO ceiling (e.g., 73 when 13 of 49 AEO checks are citation-only
   * and skipped). Present ONLY when running without BYOK / Radar — its presence
   * is the explicit signal to the renderer to display "AEO X/Y portable" with
   * an unlock disclaimer. When BYOK keys are configured (or in Radar mode) this
   * field is absent and the renderer falls back to the standard "AEO X/100".
   *
   * Mode switch must be explicit (data-driven), never inferred from check
   * statuses or templating conditions.
   */
  aeoCeiling?: number;
}

export interface AuditWrapper {
  reportId: string;
  createdAt: string;
  result: AuditResult;
}

// AIV (specialized module) types — unchanged.
export type EngineId = "chatgpt" | "claude" | "perplexity" | "gemini" | "grok" | "deepseek";
export type VerificationStatus = "PASS" | "WRONG_COMPANY" | "NO_RECORD" | "PENDING";

export interface PerEngineScore {
  engine: EngineId;
  score: number;
  cited: boolean;
  mentioned: boolean;
}

export interface CompetitorScore {
  name: string;
  score: number;
  reasons?: string[];
}

export interface MentionDetail {
  engine: EngineId;
  query: string;
  text: string;
  url?: string;
  sentiment?: "positive" | "neutral" | "negative";
}

export interface QueryResult {
  query: string;
  engine: EngineId;
  verificationStatus: VerificationStatus;
  responseExcerpt?: string;
  citedUrl?: string;
}

export interface DomainInfo {
  registeredAt?: string;
  ageDays?: number;
  source?: string;
}

export interface AeoReadinessSubpillars {
  entityStrength: number;
  contentDepth: number;
  citationSignals: number;
  schemaStructure: number;
}

export interface AeoReadiness {
  overall: number;
  subpillars?: AeoReadinessSubpillars;
}

export interface AivResult {
  reportType: string;
  clientBrandName: string;
  configuredBrandName: string;
  clientWebsiteUrl: string;
  configuredProbeQueries: string[];
  brandAliases: string[];
  scannedAt: string;

  visibilityScore: number;
  previousScore: number;
  deltaScore: number;

  perEngineScores: PerEngineScore[];
  competitorScores: CompetitorScore[];
  enginesActive: EngineId[];

  totalQueriesRun: number;
  totalMentions: number;
  topMentionText: string;
  topMentionEngine: EngineId | null;
  unmentionedEngines: EngineId[];

  perplexityLinkedToSite: boolean;
  detectedCompetitorNames: string[];
  competitorReasons: Record<string, string[]>;
  fixesThisWeek: string[];
  mentionDetails: MentionDetail[];

  aeoReadiness: AeoReadiness;
  googleEvidence?: { indexed: boolean; knowledgePanel: boolean; sitelinks: boolean };
  aiPerception?: {
    knownByEngines: EngineId[];
    descriptionConfidence: "high" | "medium" | "low";
    notes?: string;
  };
  domainInfo?: DomainInfo;

  queryResults: QueryResult[];
}

export interface AivWrapper {
  reportId: string;
  createdAt: string;
  result: AivResult;
}

export interface AnswerGapRow {
  query: string;
  engine: EngineId;
  cited: boolean;
  mentionRate: number;
  competitorsCited: string[];
  briefAvailable: boolean;
}

export interface AnswerGapResponse {
  scannedAt: string;
  rows: AnswerGapRow[];
}

export interface AivTrendPoint {
  scannedAt: string;
  visibilityScore: number;
  reportId: string;
  filled: boolean;
}

export interface AivConfig {
  brandName: string;
  brandAliases: string[];
  probeQueries: string[];
  enginesEnabled: EngineId[];
  competitorWatchlist: string[];
}
