/**
 * SEO robots.txt + sitemap checks — parity-faithful port of
 * `apex-worker-do/src/checks/seo-checks.js` lines 145-215.
 *
 * The free audit's robotsTxt object has shape `{exists, blocksAll, raw}`. Here we
 * derive those fields from the raw string in SiteContext.
 *
 * Skipped (require additional fetching, deferred to a later batch):
 *   - "Sitemap URLs Live" — needs HEAD requests against sample URLs from sitemap
 *   - "Sitemap Freshness" — needs <lastmod> parsing + age math (lift from apex-worker-do utils)
 */
import type { AuditCheck } from "../../radar/types.js";
import type { LocalCheckRunner, SiteContext } from "../types.js";

interface ParsedRobots {
  exists: boolean;
  blocksAll: boolean;
  raw: string | null;
}

function parseRobots(ctx: SiteContext): ParsedRobots {
  if (!ctx.robotsTxt) return { exists: false, blocksAll: false, raw: null };
  const raw = ctx.robotsTxt;

  // blocksAll: any "User-agent: *" group with bare "Disallow: /"
  let blocksAll = false;
  const lines = raw.split(/\r?\n/);
  let inWildcard = false;
  for (const ln of lines) {
    const trimmed = ln.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([a-zA-Z-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      inWildcard = value === "*";
    } else if (key === "disallow" && inWildcard && value === "/") {
      blocksAll = true;
      break;
    }
  }
  return { exists: true, blocksAll, raw };
}

export const seoRobotsSitemapChecks: LocalCheckRunner = (ctx) => {
  const checks: AuditCheck[] = [];
  const robots = parseRobots(ctx);

  // Robots.txt
  if (robots.exists) {
    checks.push({
      id: "robots-txt",
      title: "Robots.txt",
      category: "SEO",
      status: "pass",
      message: "Robots.txt found.",
    });
  } else {
    checks.push({
      id: "robots-txt",
      title: "Robots.txt",
      category: "SEO",
      status: "warn",
      message: "No robots.txt.",
    });
  }

  // Robots.txt Blocking
  if (robots.blocksAll) {
    checks.push({
      id: "robots-txt-blocking",
      title: "Robots.txt Blocking",
      category: "SEO",
      status: "fail",
      message: "Robots.txt disallows all crawling!",
    });
  } else {
    checks.push({
      id: "robots-txt-blocking",
      title: "Robots.txt Blocking",
      category: "SEO",
      status: "pass",
      message: "Robots.txt allows crawling.",
    });
  }

  // Robots.txt Syntax — only emitted when robots.txt exists with content
  if (robots.exists && robots.raw) {
    const knownKeys = new Set([
      "user-agent",
      "disallow",
      "allow",
      "sitemap",
      "crawl-delay",
      "host",
      "clean-param",
      "request-rate",
      "visit-time",
      "noindex",
    ]);
    const issues: string[] = [];
    const lines = robots.raw.split(/\r?\n/);
    let hasUserAgent = false;
    let currentUserAgent: string | null = null;
    const unknownDirectives = new Set<string>();
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (!trimmed.includes(":")) {
        issues.push(`line ${i + 1}: missing colon`);
        continue;
      }
      const [keyRaw, ...rest] = trimmed.split(":");
      const key = keyRaw.trim().toLowerCase();
      const value = rest.join(":").trim();
      if (key === "user-agent") {
        hasUserAgent = true;
        currentUserAgent = value;
      } else if (
        (key === "disallow" || key === "allow") &&
        currentUserAgent === null
      ) {
        issues.push(`line ${i + 1}: "${key}" before any User-agent`);
      } else if (!knownKeys.has(key)) {
        unknownDirectives.add(key);
      }
    }
    if (!hasUserAgent) issues.push("no User-agent directive anywhere");
    if (unknownDirectives.size > 0)
      issues.push(`unknown directive(s): ${[...unknownDirectives].join(", ")}`);
    if (issues.length === 0) {
      checks.push({
        id: "robots-txt-syntax",
        title: "Robots.txt Syntax",
        category: "SEO",
        status: "pass",
        message: "No syntax issues detected.",
      });
    } else {
      checks.push({
        id: "robots-txt-syntax",
        title: "Robots.txt Syntax",
        category: "SEO",
        status: "warn",
        message: `${issues.length} issue${issues.length > 1 ? "s" : ""}: ${issues
          .slice(0, 2)
          .join("; ")}${issues.length > 2 ? "…" : ""}`,
      });
    }
  }

  // XML Sitemap
  if (ctx.sitemapXml) {
    const urlCount = (ctx.sitemapXml.match(/<loc>/g) || []).length;
    checks.push({
      id: "xml-sitemap",
      title: "XML Sitemap",
      category: "SEO",
      status: "pass",
      message: `Sitemap found with ${urlCount} URLs.`,
    });
  } else {
    checks.push({
      id: "xml-sitemap",
      title: "XML Sitemap",
      category: "SEO",
      status: "warn",
      message: "No XML sitemap.",
    });
  }

  // Sitemap in Robots.txt
  if (robots.raw && robots.raw.toLowerCase().includes("sitemap:")) {
    checks.push({
      id: "sitemap-in-robots-txt",
      title: "Sitemap in Robots.txt",
      category: "SEO",
      status: "pass",
      message: "Sitemap URL declared.",
    });
  } else {
    checks.push({
      id: "sitemap-in-robots-txt",
      title: "Sitemap in Robots.txt",
      category: "SEO",
      status: "warn",
      message: "Robots.txt doesn't reference sitemap.",
    });
  }

  return checks;
};
