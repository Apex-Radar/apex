import type {
  AivWrapper,
  AnswerGapResponse,
  AivTrendPoint,
  AivConfig,
} from "./types.js";

export interface AivClientOptions {
  baseUrl?: string;
  portalToken: string;
  fetchImpl?: typeof fetch;
}

const DEFAULT_BASE = "https://app.getapexradar.com";

export class RadarAivClient {
  private base: string;
  private token: string;
  private f: typeof fetch;

  constructor(opts: AivClientOptions) {
    if (!opts.portalToken) throw new Error("portalToken required");
    this.base = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
    this.token = opts.portalToken;
    this.f = opts.fetchImpl ?? fetch;
  }

  private path(suffix: string): string {
    return `${this.base}/api/portal/${this.token}/aiv${suffix}`;
  }

  private async getJson<T>(suffix: string): Promise<T> {
    const r = await this.f(this.path(suffix), { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`AIV GET ${suffix} ${r.status}`);
    return (await r.json()) as T;
  }

  // GET /api/portal/:token/aiv/latest
  getLatest(): Promise<AivWrapper> {
    return this.getJson<AivWrapper>("/latest");
  }

  // GET /api/portal/:token/aiv/scans
  getScans(): Promise<AivWrapper[]> {
    return this.getJson<AivWrapper[]>("/scans");
  }

  // GET /api/portal/:token/aiv/answer-gap
  getAnswerGap(): Promise<AnswerGapResponse> {
    return this.getJson<AnswerGapResponse>("/answer-gap");
  }

  // GET /api/portal/:token/aiv/trend
  getTrend(): Promise<AivTrendPoint[]> {
    return this.getJson<AivTrendPoint[]>("/trend");
  }

  // GET /api/portal/:token/aiv/config
  getConfig(): Promise<AivConfig> {
    return this.getJson<AivConfig>("/config");
  }

  // POST /api/portal/:token/aiv/scan
  async runScan(): Promise<{ scanId: string }> {
    const r = await this.f(this.path("/scan"), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: "{}",
    });
    if (!r.ok) throw new Error(`AIV scan ${r.status}`);
    return (await r.json()) as { scanId: string };
  }
}
