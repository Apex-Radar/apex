/**
 * SEO structural checks — parity-faithful port of `apex-worker-do/src/checks/seo-checks.js`
 * lines 137-232 (page size, inline CSS, render-blocking, deprecated HTML, iframes,
 * text compression, structured data, social media links, exposed emails, duplicate meta,
 * content freshness).
 *
 * Robots.txt + Sitemap checks are in seo-robots-sitemap.ts.
 */
import * as cheerio from "cheerio";
import type { AuditCheck } from "../../radar/types.js";
import type { LocalCheckRunner } from "../types.js";

export const seoStructureChecks: LocalCheckRunner = (ctx) => {
  const checks: AuditCheck[] = [];
  const page = ctx.pages[0];
  if (!page || !page.html) return checks;

  const $ = cheerio.load(page.html);
  const htmlSize = page.html.length;
  const pageSizeKb = Math.round(htmlSize / 1024);

  // Page Size: >500KB warn
  if (pageSizeKb > 500) {
    checks.push({
      id: "page-size",
      title: "Page Size",
      category: "SEO",
      status: "warn",
      message: `HTML is ${pageSizeKb}KB.`,
    });
  } else {
    checks.push({
      id: "page-size",
      title: "Page Size",
      category: "SEO",
      status: "pass",
      message: `HTML is ${pageSizeKb}KB.`,
    });
  }

  // Inline CSS: >20 inline styles warn
  const inlineStyles = $("[style]").length;
  if (inlineStyles > 20) {
    checks.push({
      id: "inline-css",
      title: "Inline CSS",
      category: "SEO",
      status: "warn",
      message: `${inlineStyles} inline styles.`,
    });
  } else {
    checks.push({
      id: "inline-css",
      title: "Inline CSS",
      category: "SEO",
      status: "pass",
      message: `${inlineStyles} inline styles.`,
    });
  }

  // Render-Blocking Scripts: >2 in head (excluding async/defer/json-ld) warn
  const blockingScripts = $(
    "head script:not([async]):not([defer]):not([type='application/ld+json'])",
  ).length;
  if (blockingScripts > 2) {
    checks.push({
      id: "render-blocking-scripts",
      title: "Render-Blocking Scripts",
      category: "SEO",
      status: "warn",
      message: `${blockingScripts} blocking scripts.`,
    });
  } else {
    checks.push({
      id: "render-blocking-scripts",
      title: "Render-Blocking Scripts",
      category: "SEO",
      status: "pass",
      message: `${blockingScripts} blocking scripts.`,
    });
  }

  // Deprecated HTML
  const deprecated = ["font", "center", "marquee", "blink", "strike", "big"];
  let deprecatedCount = 0;
  for (const tag of deprecated) deprecatedCount += $(tag).length;
  if (deprecatedCount > 0) {
    checks.push({
      id: "deprecated-html",
      title: "Deprecated HTML",
      category: "SEO",
      status: "warn",
      message: `${deprecatedCount} deprecated elements.`,
    });
  } else {
    checks.push({
      id: "deprecated-html",
      title: "Deprecated HTML",
      category: "SEO",
      status: "pass",
      message: "No deprecated HTML.",
    });
  }

  // Iframes: >3 warn
  const iframes = $("iframe").length;
  if (iframes > 3) {
    checks.push({
      id: "iframes",
      title: "Iframes",
      category: "SEO",
      status: "warn",
      message: `${iframes} iframes.`,
    });
  } else {
    checks.push({
      id: "iframes",
      title: "Iframes",
      category: "SEO",
      status: "pass",
      message: `${iframes} iframe(s).`,
    });
  }

  // Text Compression — proxy via page size; >100KB warn (free audit uses same)
  if (pageSizeKb > 100) {
    checks.push({
      id: "text-compression",
      title: "Text Compression",
      category: "SEO",
      status: "warn",
      message: `Large HTML (${pageSizeKb}KB). Check gzip.`,
    });
  } else {
    checks.push({
      id: "text-compression",
      title: "Text Compression",
      category: "SEO",
      status: "pass",
      message: "Page small enough.",
    });
  }

  // Structured Data — JSON-LD blocks + their @type
  const jsonLd = $('script[type="application/ld+json"]');
  const schemaTypes: any[] = [];
  jsonLd.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      const extract = (obj: any) => {
        if (obj && typeof obj === "object") {
          if (obj["@type"]) schemaTypes.push(obj["@type"]);
          if (Array.isArray(obj["@graph"])) obj["@graph"].forEach(extract);
        }
      };
      extract(data);
    } catch {
      // bad JSON — counted as a JSON-LD block but no @type
    }
  });
  const uniqueTypes = [...new Set(schemaTypes.flat())];
  if (jsonLd.length === 0 && $("[itemtype]").length === 0) {
    checks.push({
      id: "structured-data",
      title: "Structured Data",
      category: "SEO",
      status: "fail",
      message: "No structured data.",
    });
  } else if (uniqueTypes.length >= 1) {
    checks.push({
      id: "structured-data",
      title: "Structured Data",
      category: "SEO",
      status: "pass",
      message: `${jsonLd.length} JSON-LD blocks. Types: ${uniqueTypes.join(", ")}.`,
    });
  } else {
    checks.push({
      id: "structured-data",
      title: "Structured Data",
      category: "SEO",
      status: "warn",
      message: "Schema present but no @type detected.",
    });
  }

  // Social Media Links
  const socialDomains = [
    "facebook.com",
    "twitter.com",
    "x.com",
    "linkedin.com",
    "instagram.com",
    "youtube.com",
    "tiktok.com",
  ];
  let socialLinks = 0;
  $("a[href]").each((_, a) => {
    const h = $(a).attr("href") || "";
    if (socialDomains.some((d) => h.includes(d))) socialLinks++;
  });
  if (socialLinks > 0) {
    checks.push({
      id: "social-media-links",
      title: "Social Media Links",
      category: "SEO",
      status: "pass",
      message: `${socialLinks} social links.`,
    });
  } else {
    checks.push({
      id: "social-media-links",
      title: "Social Media Links",
      category: "SEO",
      status: "warn",
      message: "No social media links.",
    });
  }

  // Exposed Emails: >2 warn
  const emails =
    page.html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  if (emails.length > 2) {
    checks.push({
      id: "exposed-emails",
      title: "Exposed Emails",
      category: "SEO",
      status: "warn",
      message: `${emails.length} emails exposed.`,
    });
  } else {
    checks.push({
      id: "exposed-emails",
      title: "Exposed Emails",
      category: "SEO",
      status: "pass",
      message: "No excessive email exposure.",
    });
  }

  // Duplicate Meta Tags
  const tc = $("title").length;
  const dc = $('meta[name="description"]').length;
  if (tc > 1 || dc > 1) {
    checks.push({
      id: "duplicate-meta-tags",
      title: "Duplicate Meta Tags",
      category: "SEO",
      status: "fail",
      message: "Duplicate meta tags found.",
    });
  } else {
    checks.push({
      id: "duplicate-meta-tags",
      title: "Duplicate Meta Tags",
      category: "SEO",
      status: "pass",
      message: "No duplicates.",
    });
  }

  // Content Freshness
  const datePublished =
    $('meta[property="article:published_time"]').attr("content") ||
    $("time[datetime]").first().attr("datetime");
  if (datePublished) {
    const days = Math.round(
      (Date.now() - new Date(datePublished).getTime()) / 86400000,
    );
    if (days < 90) {
      checks.push({
        id: "content-freshness",
        title: "Content Freshness",
        category: "SEO",
        status: "pass",
        message: `Dated ${days} days ago.`,
      });
    } else if (days < 365) {
      checks.push({
        id: "content-freshness",
        title: "Content Freshness",
        category: "SEO",
        status: "warn",
        message: `${days} days old.`,
      });
    } else {
      checks.push({
        id: "content-freshness",
        title: "Content Freshness",
        category: "SEO",
        status: "warn",
        message: `${Math.round(days / 365)}+ years old.`,
      });
    }
  } else {
    checks.push({
      id: "content-freshness",
      title: "Content Freshness",
      category: "SEO",
      status: "warn",
      message: "No publication date.",
    });
  }

  return checks;
};
