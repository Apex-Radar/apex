/**
 * SEO content checks — parity-faithful port of `apex-worker-do/src/checks/seo-checks.js`
 * lines 5-25 + 70-80.
 *
 * Each check's `title` field MUST match the free audit's `name` field exactly
 * for the parity rig (`tools/parity.ts`) to recognize them as the same check.
 */
import * as cheerio from "cheerio";
import type { AuditCheck } from "../../radar/types.js";
import type { LocalCheckRunner } from "../types.js";

export const contentChecks: LocalCheckRunner = (ctx) => {
  const checks: AuditCheck[] = [];
  const page = ctx.pages[0];
  if (!page || !page.html) return checks;

  const $ = cheerio.load(page.html);

  // Title Tag — free audit thresholds: <30 warn (short), >60 warn (long), 30-60 pass
  const title = $("title").first().text().trim();
  if (!title) {
    checks.push({
      id: "title-tag",
      title: "Title Tag",
      category: "SEO",
      status: "fail",
      message: "No <title> tag found.",
    });
  } else if (title.length < 30) {
    checks.push({
      id: "title-tag",
      title: "Title Tag",
      category: "SEO",
      status: "warn",
      message: `Title is short (${title.length} chars). Aim for 50-60.`,
    });
  } else if (title.length > 60) {
    checks.push({
      id: "title-tag",
      title: "Title Tag",
      category: "SEO",
      status: "warn",
      message: `Title is long (${title.length} chars). May be truncated.`,
    });
  } else {
    checks.push({
      id: "title-tag",
      title: "Title Tag",
      category: "SEO",
      status: "pass",
      message: `Title tag present (${title.length} chars). Good length.`,
    });
  }

  // Meta Description — free audit thresholds: missing fail, <70 warn, >160 warn, 70-160 pass
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  if (!metaDesc) {
    checks.push({
      id: "meta-description",
      title: "Meta Description",
      category: "SEO",
      status: "fail",
      message: "No meta description. Critical for search snippets.",
    });
  } else if (metaDesc.length < 70) {
    checks.push({
      id: "meta-description",
      title: "Meta Description",
      category: "SEO",
      status: "warn",
      message: `Meta description short (${metaDesc.length} chars). Aim for 120-160.`,
    });
  } else if (metaDesc.length > 160) {
    checks.push({
      id: "meta-description",
      title: "Meta Description",
      category: "SEO",
      status: "warn",
      message: `Meta description long (${metaDesc.length} chars).`,
    });
  } else {
    checks.push({
      id: "meta-description",
      title: "Meta Description",
      category: "SEO",
      status: "pass",
      message: `Meta description present (${metaDesc.length} chars).`,
    });
  }

  // H1 Tag — free audit: 0 fail, 1 pass, >1 warn
  const h1Count = $("h1").length;
  if (h1Count === 0) {
    checks.push({
      id: "h1-tag",
      title: "H1 Tag",
      category: "SEO",
      status: "fail",
      message: "No <h1> tag found.",
    });
  } else if (h1Count === 1) {
    checks.push({
      id: "h1-tag",
      title: "H1 Tag",
      category: "SEO",
      status: "pass",
      message: "Exactly one <h1> tag.",
    });
  } else {
    checks.push({
      id: "h1-tag",
      title: "H1 Tag",
      category: "SEO",
      status: "warn",
      message: `${h1Count} <h1> tags found. Best practice is exactly one.`,
    });
  }

  // Heading Hierarchy — free audit: no H2 warn, H4-without-H3 warn, otherwise pass
  const h2Count = $("h2").length;
  const h3Count = $("h3").length;
  const h4Count = $("h4").length;
  if (h2Count === 0) {
    checks.push({
      id: "heading-hierarchy",
      title: "Heading Hierarchy",
      category: "SEO",
      status: "warn",
      message: "No <h2> tags found.",
    });
  } else if (h4Count > 0 && h3Count === 0) {
    checks.push({
      id: "heading-hierarchy",
      title: "Heading Hierarchy",
      category: "SEO",
      status: "warn",
      message: "Heading levels skipped (H2 → H4).",
    });
  } else {
    checks.push({
      id: "heading-hierarchy",
      title: "Heading Hierarchy",
      category: "SEO",
      status: "pass",
      message: `Good structure: ${h2Count} H2, ${h3Count} H3, ${h4Count} H4.`,
    });
  }

  // Word Count — free audit: <300 fail, 300-800 warn, >800 pass
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(" ").filter((w) => w.length > 0).length;
  if (wordCount > 800) {
    checks.push({
      id: "word-count",
      title: "Word Count",
      category: "SEO",
      status: "pass",
      message: `${wordCount} words.`,
    });
  } else if (wordCount > 300) {
    checks.push({
      id: "word-count",
      title: "Word Count",
      category: "SEO",
      status: "warn",
      message: `${wordCount} words. Add more content.`,
    });
  } else {
    checks.push({
      id: "word-count",
      title: "Word Count",
      category: "SEO",
      status: "fail",
      message: `Only ${wordCount} words. Thin content.`,
    });
  }

  // Content-to-HTML Ratio — free audit: <10 fail, 10-25 warn, >25 pass
  const htmlSize = page.html.length;
  const ratio = Math.round((bodyText.length / htmlSize) * 100);
  if (ratio > 25) {
    checks.push({
      id: "content-to-html-ratio",
      title: "Content-to-HTML Ratio",
      category: "SEO",
      status: "pass",
      message: `${ratio}% text content.`,
    });
  } else if (ratio > 10) {
    checks.push({
      id: "content-to-html-ratio",
      title: "Content-to-HTML Ratio",
      category: "SEO",
      status: "warn",
      message: `${ratio}% text content.`,
    });
  } else {
    checks.push({
      id: "content-to-html-ratio",
      title: "Content-to-HTML Ratio",
      category: "SEO",
      status: "fail",
      message: `Only ${ratio}% text content.`,
    });
  }

  return checks;
};
