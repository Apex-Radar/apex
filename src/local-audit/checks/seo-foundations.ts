/**
 * SEO foundation checks — parity-faithful port of `apex-worker-do/src/checks/seo-checks.js`
 * lines 27-68 (canonical, https, robots meta, OG, html lang, hreflang).
 *
 * Note: "Canonical Resolves" requires a HEAD fetch of the canonical URL — deferred
 * to a later batch (it depends on adding a `canonicalCheck` to SiteContext).
 */
import * as cheerio from "cheerio";
import type { AuditCheck } from "../../radar/types.js";
import type { LocalCheckRunner } from "../types.js";

export const seoFoundationsChecks: LocalCheckRunner = (ctx) => {
  const checks: AuditCheck[] = [];
  const page = ctx.pages[0];
  if (!page || !page.html) return checks;

  const $ = cheerio.load(page.html);

  // Canonical Tag
  const canonical = $('link[rel="canonical"]').attr("href") || "";
  if (!canonical) {
    checks.push({
      id: "canonical-tag",
      title: "Canonical Tag",
      category: "SEO",
      status: "warn",
      message: "No canonical tag.",
    });
  } else {
    checks.push({
      id: "canonical-tag",
      title: "Canonical Tag",
      category: "SEO",
      status: "pass",
      message: "Canonical tag set.",
    });
  }

  // HTTPS
  if (page.url.startsWith("https://")) {
    checks.push({
      id: "https",
      title: "HTTPS",
      category: "SEO",
      status: "pass",
      message: "Site uses HTTPS.",
    });
  } else {
    checks.push({
      id: "https",
      title: "HTTPS",
      category: "SEO",
      status: "fail",
      message: "Site does not use HTTPS.",
    });
  }

  // Robots Meta
  const robotsMeta = $('meta[name="robots"]').attr("content") || "";
  if (robotsMeta.includes("noindex")) {
    checks.push({
      id: "robots-meta",
      title: "Robots Meta",
      category: "SEO",
      status: "fail",
      message: "Page has noindex.",
    });
  } else if (robotsMeta.includes("nofollow")) {
    checks.push({
      id: "robots-meta",
      title: "Robots Meta",
      category: "SEO",
      status: "warn",
      message: "Page has nofollow.",
    });
  } else {
    checks.push({
      id: "robots-meta",
      title: "Robots Meta",
      category: "SEO",
      status: "pass",
      message: "No restrictive robots directives.",
    });
  }

  // Open Graph Tags — pass if all 3 (title, desc, image) present, warn if partial, fail if none
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");
  const ogCount = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
  if (ogCount === 3) {
    checks.push({
      id: "open-graph-tags",
      title: "Open Graph Tags",
      category: "SEO",
      status: "pass",
      message: "Full OG tags present.",
    });
  } else if (ogCount > 0) {
    checks.push({
      id: "open-graph-tags",
      title: "Open Graph Tags",
      category: "SEO",
      status: "warn",
      message: `Partial OG tags (${ogCount}/3).`,
    });
  } else {
    checks.push({
      id: "open-graph-tags",
      title: "Open Graph Tags",
      category: "SEO",
      status: "fail",
      message: "No Open Graph tags.",
    });
  }

  // HTML Language
  const lang = $("html").attr("lang");
  if (lang) {
    checks.push({
      id: "html-language",
      title: "HTML Language",
      category: "SEO",
      status: "pass",
      message: `Language: ${lang}.`,
    });
  } else {
    checks.push({
      id: "html-language",
      title: "HTML Language",
      category: "SEO",
      status: "warn",
      message: "No lang attribute.",
    });
  }

  // Hreflang Tags — present pass; absent also pass (only needed for multi-language)
  const hreflang = $('link[rel="alternate"][hreflang]');
  if (hreflang.length > 0) {
    checks.push({
      id: "hreflang-tags",
      title: "Hreflang Tags",
      category: "SEO",
      status: "pass",
      message: `${hreflang.length} hreflang tags.`,
    });
  } else {
    checks.push({
      id: "hreflang-tags",
      title: "Hreflang Tags",
      category: "SEO",
      status: "pass",
      message: "No hreflang (only needed for multi-language).",
    });
  }

  return checks;
};
