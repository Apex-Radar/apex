import type { AuditWrapper, AuditCheck, CheckCategory, CheckStatus } from "./types.js";
import { AeoAuditResponseSchema, parseOrAlert } from "@apexradar/contracts";

export interface RadarClientOptions {
  baseUrl?: string;
  portalToken: string;
  fetchImpl?: typeof fetch;
}

const DEFAULT_BASE = "https://app.getapexradar.com";

export async function fetchLatestAudit(portalToken: string): Promise<AuditWrapper> {
  return new RadarAuditClient({ portalToken }).getLatest();
}

/**
 * Radar's wire format uses { name, details, affectedPages, totalPages, fixable } per check.
 * Canonical AuditCheck shape uses { id, title, message, impact, category, status }.
 * This adapter translates at the boundary so downstream code (renderer, gaps, prove) reads
 * one stable contract regardless of Radar's wire shape evolution.
 */
function adaptRadarCheck(raw: any): AuditCheck {
  const name: string = raw.name ?? raw.title ?? "Untitled check";
  const details: string = raw.details ?? raw.message ?? "";
  const affected: number | undefined = typeof raw.affectedPages === "number" ? raw.affectedPages : undefined;
  const total: number | undefined = typeof raw.totalPages === "number" ? raw.totalPages : undefined;

  // If Radar's response includes affected/total page counts and the message doesn't already
  // mention them, append a "(N of M pages)" suffix so the renderer surfaces it.
  let message = details;
  if (affected !== undefined && total !== undefined && total > 0 && !/of \d+ pages?/i.test(details)) {
    if (raw.status === "fail" || (raw.status === "warn" && affected > 0)) {
      message = details ? `${details} (Affects ${affected} of ${total} pages)` : `Affects ${affected} of ${total} pages`;
    }
  }

  return {
    id: raw.id ?? slugifyName(name),
    title: name,
    category: (raw.category === "AEO" ? "AEO" : "SEO") as CheckCategory,
    status: ((raw.status === "pass" || raw.status === "warn" || raw.status === "fail") ? raw.status : "warn") as CheckStatus,
    message,
    impact: typeof raw.impact === "number" ? raw.impact : undefined,
  };
}

function slugifyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export class RadarAuditClient {
  private base: string;
  private token: string;
  private f: typeof fetch;

  constructor(opts: RadarClientOptions) {
    if (!opts.portalToken) throw new Error("portalToken required");
    this.base = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
    this.token = opts.portalToken;
    this.f = opts.fetchImpl ?? fetch;
  }

  async getLatest(): Promise<AuditWrapper> {
    const url = `${this.base}/api/portal/${this.token}/aeo-audit/latest`;
    const r = await this.f(url, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`Radar audit/latest ${r.status}`);
    const raw = (await r.json()) as any;
    // Parse-validate against the canonical schema. Drift logs to stderr
    // (the alert dispatcher default) and falls through to the existing
    // permissive adapter — keeps the CLI working on legacy responses
    // while still surfacing wire-shape changes loudly.
    parseOrAlert(AeoAuditResponseSchema, raw, {
      source: "GET /aeo-audit/latest",
      detectedAt: "client-parse",
      schemaName: "AeoAuditResponse",
      onDrift: "fallback",
      fallback: null,
      context: { token: this.token.slice(0, 8) + "…" },
    });

    // Radar may return either a wrapper {reportId, createdAt, result: {...}} or a bare result.
    // It also uses `name`/`details` per check; we adapt to canonical {title, message}.
    const result = raw.result ?? raw;
    const checks = Array.isArray(result.checks) ? result.checks.map(adaptRadarCheck) : [];

    // IMPORTANT contract note: as of 2026-05-07, the `/aeo-audit/latest` endpoint
    // does NOT return `readiness` or `citation` fields. They are populated by a
    // separate AIV pipeline. We pass `undefined` through so the renderer cleanly
    // skips the AAIV block instead of showing a placeholder "0/100". When the
    // server-side fix lands (BUG-2026-016 — server should include readiness +
    // citation in `/aeo-audit/latest`), this falsy-check still works correctly.
    return {
      reportId: raw.reportId ?? result.reportId ?? "",
      createdAt: raw.createdAt ?? result.createdAt ?? new Date().toISOString(),
      result: {
        url: result.url ?? "",
        overallScore: result.overallScore ?? 0,
        seoScore: result.seoScore ?? 0,
        aeoScore: result.aeoScore ?? 0,
        checks,
        // Pass through if present; otherwise undefined so the renderer skips the section.
        readiness: result.readiness ?? undefined as any,
        citation: result.citation ?? undefined as any,
        aiCitation: result.aiCitation ?? { chatgptCited: false, perplexityCited: false },
        domainAgeDays: result.domainAgeDays,
        domainAgeContext: result.domainAgeContext,
        source: "radar",
      },
    };
  }

  async runScan(targetUrl?: string): Promise<{ scanId: string }> {
    const url = `${this.base}/api/portal/${this.token}/aeo-scan`;
    const r = await this.f(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(targetUrl ? { url: targetUrl } : {}),
    });
    if (!r.ok) throw new Error(`Radar aeo-scan ${r.status}`);
    return (await r.json()) as { scanId: string };
  }
}
