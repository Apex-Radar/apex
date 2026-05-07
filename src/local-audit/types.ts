import type { AuditCheck } from "../radar/types.js";

export interface LocalAuditInput {
  url: string;
  /** max pages to crawl from the same origin (default 1 = single page) */
  depth?: number;
  /** override user-agent for fetches */
  userAgent?: string;
  /** abort fetches after this many ms (default 15000) */
  timeoutMs?: number;
}

export interface FetchedPage {
  url: string;
  status: number;
  html: string;
  headers: Record<string, string>;
  fetchedAt: string;
}

export interface SiteContext {
  origin: string;
  robotsTxt: string | null;
  llmsTxt: string | null;
  /** Raw sitemap.xml content if `/sitemap.xml` exists on origin (or declared in robots.txt). */
  sitemapXml: string | null;
  pages: FetchedPage[];
}

export type LocalCheckRunner = (ctx: SiteContext) => AuditCheck[];
