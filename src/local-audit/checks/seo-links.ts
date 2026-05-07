/**
 * SEO link + URL checks — parity-faithful port of `apex-worker-do/src/checks/seo-checks.js`
 * lines 101-135 (internal/external/empty links, anchor text, nofollow, URL length, URL chars).
 */
import * as cheerio from "cheerio";
import type { AuditCheck } from "../../radar/types.js";
import type { LocalCheckRunner } from "../types.js";

export const seoLinkChecks: LocalCheckRunner = (ctx) => {
  const checks: AuditCheck[] = [];
  const page = ctx.pages[0];
  if (!page || !page.html) return checks;

  const $ = cheerio.load(page.html);
  const allLinks = $("a[href]");
  const parsedUrl = new URL(page.url);

  let internalLinks = 0;
  let externalLinks = 0;
  let emptyLinks = 0;
  allLinks.each((_, a) => {
    const href = $(a).attr("href") || "";
    if (href === "#" || href === "") emptyLinks++;
    else if (href.startsWith("/") || href.includes(parsedUrl.hostname)) internalLinks++;
    else if (href.startsWith("http")) externalLinks++;
  });

  // Internal Links: >3 pass, 1-3 warn, 0 fail
  if (internalLinks > 3) {
    checks.push({
      id: "internal-links",
      title: "Internal Links",
      category: "SEO",
      status: "pass",
      message: `${internalLinks} internal links.`,
    });
  } else if (internalLinks > 0) {
    checks.push({
      id: "internal-links",
      title: "Internal Links",
      category: "SEO",
      status: "warn",
      message: `Only ${internalLinks} internal links.`,
    });
  } else {
    checks.push({
      id: "internal-links",
      title: "Internal Links",
      category: "SEO",
      status: "fail",
      message: "No internal links.",
    });
  }

  // External Links: any pass, none warn
  if (externalLinks > 0) {
    checks.push({
      id: "external-links",
      title: "External Links",
      category: "SEO",
      status: "pass",
      message: `${externalLinks} external links.`,
    });
  } else {
    checks.push({
      id: "external-links",
      title: "External Links",
      category: "SEO",
      status: "warn",
      message: "No external links.",
    });
  }

  // Empty Links: >3 warn, otherwise pass
  if (emptyLinks > 3) {
    checks.push({
      id: "empty-links",
      title: "Empty Links",
      category: "SEO",
      status: "warn",
      message: `${emptyLinks} empty links.`,
    });
  } else {
    checks.push({
      id: "empty-links",
      title: "Empty Links",
      category: "SEO",
      status: "pass",
      message: `${emptyLinks || "No"} empty links.`,
    });
  }

  // Link Anchor Text — generic anchors
  const genericTexts = ["click here", "read more", "learn more", "here", "link"];
  let genericAnchors = 0;
  allLinks.each((_, a) => {
    if (genericTexts.includes($(a).text().trim().toLowerCase())) genericAnchors++;
  });
  if (genericAnchors > 3) {
    checks.push({
      id: "link-anchor-text",
      title: "Link Anchor Text",
      category: "SEO",
      status: "warn",
      message: `${genericAnchors} generic anchors.`,
    });
  } else {
    checks.push({
      id: "link-anchor-text",
      title: "Link Anchor Text",
      category: "SEO",
      status: "pass",
      message: "Descriptive anchor text.",
    });
  }

  // Nofollow Links
  const nofollowLinks = $('a[rel*="nofollow"]').length;
  if (nofollowLinks > 0) {
    checks.push({
      id: "nofollow-links",
      title: "Nofollow Links",
      category: "SEO",
      status: "warn",
      message: `${nofollowLinks} nofollow links.`,
    });
  } else {
    checks.push({
      id: "nofollow-links",
      title: "Nofollow Links",
      category: "SEO",
      status: "pass",
      message: "No nofollow links.",
    });
  }

  // URL Length: >100 chars warn
  const urlPath = parsedUrl.pathname;
  if (urlPath.length > 100) {
    checks.push({
      id: "url-length",
      title: "URL Length",
      category: "SEO",
      status: "warn",
      message: `URL is ${urlPath.length} chars.`,
    });
  } else {
    checks.push({
      id: "url-length",
      title: "URL Length",
      category: "SEO",
      status: "pass",
      message: `URL is ${urlPath.length} chars.`,
    });
  }

  // URL Characters: special chars warn
  if (/[^a-zA-Z0-9\-_/.]/.test(urlPath)) {
    checks.push({
      id: "url-characters",
      title: "URL Characters",
      category: "SEO",
      status: "warn",
      message: "URL contains special characters.",
    });
  } else {
    checks.push({
      id: "url-characters",
      title: "URL Characters",
      category: "SEO",
      status: "pass",
      message: "URL uses clean characters.",
    });
  }

  return checks;
};
