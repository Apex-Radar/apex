/**
 * AEO content + signal checks — parity-faithful port of `apex-worker-do/src/checks/aeo-checks.js`
 * lines 386-500. Covers: question headings, direct answer format/blocks, lists, tables,
 * paragraphs, content depth, entity mentions, citation-ready paragraphs, FAQ content,
 * authority signals, CTAs, location signals, topical focus, content originality,
 * semantic HTML, External Authority Links.
 *
 * Not yet ported: "Raw HTML Adequacy" — needs a separate raw-HTML fetch check
 * (the `rawHtmlCheck` argument in the free audit). Deferred to a later batch.
 */
import * as cheerio from "cheerio";
import type { AuditCheck } from "../../radar/types.js";
import type { LocalCheckRunner } from "../types.js";

export const aeoContentChecks: LocalCheckRunner = (ctx) => {
  const checks: AuditCheck[] = [];
  const page = ctx.pages[0];
  if (!page || !page.html) return checks;

  const $ = cheerio.load(page.html);
  const bodyText = $("body").text().replace(/\s+/g, " ").trim().toLowerCase();
  const headings: string[] = [];
  $("h1, h2, h3, h4").each((_, el) => headings.push($(el).text().trim()));

  // Question Headings
  const qWords = ["what", "how", "why", "when", "where", "who", "which", "can", "does", "is", "are", "should", "will", "do"];
  const qHeadings = headings.filter((h) => {
    const l = h.toLowerCase();
    return qWords.some((w) => l.startsWith(w + " ")) || l.endsWith("?");
  });
  if (qHeadings.length >= 5) {
    checks.push({ id: "question-headings", title: "Question Headings", category: "AEO", status: "pass", message: `${qHeadings.length} question headings.`, impact: 5 });
  } else if (qHeadings.length >= 2) {
    checks.push({ id: "question-headings", title: "Question Headings", category: "AEO", status: "warn", message: `${qHeadings.length} question headings.`, impact: 5 });
  } else {
    checks.push({ id: "question-headings", title: "Question Headings", category: "AEO", status: "fail", message: "Few question-based headings.", impact: 5 });
  }

  // Direct Answer Format
  const defs = [" is a ", " is the ", " refers to ", " means ", " are defined as "];
  if (defs.some((p) => bodyText.includes(p))) {
    checks.push({ id: "direct-answer-format", title: "Direct Answer Format", category: "AEO", status: "pass", message: "Direct answer patterns found.", impact: 5 });
  } else {
    checks.push({ id: "direct-answer-format", title: "Direct Answer Format", category: "AEO", status: "warn", message: "No direct answer patterns.", impact: 5 });
  }

  // Direct Answer Blocks
  let h2Count = 0;
  let shortAnswers = 0;
  $("h2").each((_, h2) => {
    h2Count++;
    const firstPara = $(h2).nextAll("p").first();
    if (firstPara.length === 0) return;
    const wc = firstPara.text().trim().split(/\s+/).filter(Boolean).length;
    if (wc > 0 && wc <= 60) shortAnswers++;
  });
  if (h2Count === 0) {
    checks.push({ id: "direct-answer-blocks", title: "Direct Answer Blocks", category: "AEO", status: "warn", message: "No H2 sections to evaluate.", impact: 5 });
  } else {
    const pct = Math.round((shortAnswers / h2Count) * 100);
    if (pct >= 50) {
      checks.push({ id: "direct-answer-blocks", title: "Direct Answer Blocks", category: "AEO", status: "pass", message: `${shortAnswers} of ${h2Count} H2 sections open with a ≤60-word summary. Good LLM extractability.`, impact: 5 });
    } else if (pct >= 25) {
      checks.push({ id: "direct-answer-blocks", title: "Direct Answer Blocks", category: "AEO", status: "warn", message: `Only ${shortAnswers} of ${h2Count} H2 sections lead with a short summary paragraph. LLMs prefer concise direct answers.`, impact: 5 });
    } else {
      checks.push({ id: "direct-answer-blocks", title: "Direct Answer Blocks", category: "AEO", status: "fail", message: `${shortAnswers} of ${h2Count} H2 sections lead with a short summary. LLMs struggle to extract answers from dense sections.`, impact: 5 });
    }
  }

  // List Content
  const totalLists = $("ol").length + $("ul").length;
  if (totalLists >= 3) {
    checks.push({ id: "list-content", title: "List Content", category: "AEO", status: "pass", message: `${totalLists} lists found.` });
  } else if (totalLists >= 1) {
    checks.push({ id: "list-content", title: "List Content", category: "AEO", status: "warn", message: `${totalLists} list(s).` });
  } else {
    checks.push({ id: "list-content", title: "List Content", category: "AEO", status: "fail", message: "No lists." });
  }

  // Table Content
  const tableCount = $("table").length;
  if (tableCount > 0) {
    checks.push({ id: "table-content", title: "Table Content", category: "AEO", status: "pass", message: `${tableCount} table(s) found.`, impact: 1 });
  } else {
    checks.push({ id: "table-content", title: "Table Content", category: "AEO", status: "warn", message: "No tables.", impact: 1 });
  }

  // Paragraph Length + Citation-Ready Paragraphs (computed in same pass)
  const paragraphs = $("p");
  let longParas = 0;
  let citationReady = 0;
  paragraphs.each((_, p) => {
    const text = $(p).text().trim();
    const words = text.split(/\s+/).length;
    if (words > 150) longParas++;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    if (sentences.length >= 2 && sentences.length <= 4 && words >= 30 && words <= 80) citationReady++;
  });
  if (longParas > 3) {
    checks.push({ id: "paragraph-length", title: "Paragraph Length", category: "AEO", status: "warn", message: `${longParas} long paragraphs.`, impact: 1 });
  } else {
    checks.push({ id: "paragraph-length", title: "Paragraph Length", category: "AEO", status: "pass", message: "Paragraph lengths suitable.", impact: 1 });
  }

  // Content Depth (AEO version — different thresholds than SEO Word Count)
  const wordCount = bodyText.split(" ").filter((w) => w.length > 0).length;
  if (wordCount > 1500) {
    checks.push({ id: "content-depth", title: "Content Depth", category: "AEO", status: "pass", message: `${wordCount} words.`, impact: 5 });
  } else if (wordCount > 500) {
    checks.push({ id: "content-depth", title: "Content Depth", category: "AEO", status: "warn", message: `${wordCount} words.`, impact: 5 });
  } else {
    checks.push({ id: "content-depth", title: "Content Depth", category: "AEO", status: "fail", message: `Only ${wordCount} words.`, impact: 5 });
  }

  // Entity Mentions
  const properNouns = bodyText.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || [];
  const uniqueEntities = [...new Set(properNouns)].length;
  if (uniqueEntities > 10) {
    checks.push({ id: "entity-mentions", title: "Entity Mentions", category: "AEO", status: "pass", message: `${uniqueEntities}+ entities.` });
  } else {
    checks.push({ id: "entity-mentions", title: "Entity Mentions", category: "AEO", status: "warn", message: "Few entity mentions." });
  }

  // Citation-Ready Paragraphs
  if (citationReady >= 5) {
    checks.push({ id: "citation-ready-paragraphs", title: "Citation-Ready Paragraphs", category: "AEO", status: "pass", message: `${citationReady} citation-ready paras.`, impact: 5 });
  } else if (citationReady >= 2) {
    checks.push({ id: "citation-ready-paragraphs", title: "Citation-Ready Paragraphs", category: "AEO", status: "warn", message: `${citationReady} citation-ready paras.`, impact: 5 });
  } else {
    checks.push({ id: "citation-ready-paragraphs", title: "Citation-Ready Paragraphs", category: "AEO", status: "fail", message: "No citation-ready paragraphs.", impact: 5 });
  }

  // FAQ Content (text-based, not schema)
  const faqInd = ["frequently asked", "common questions", "faq", "q&a", "q:", "a:"];
  if (faqInd.some((f) => bodyText.includes(f))) {
    checks.push({ id: "faq-content", title: "FAQ Content", category: "AEO", status: "pass", message: "FAQ content detected." });
  } else {
    checks.push({ id: "faq-content", title: "FAQ Content", category: "AEO", status: "warn", message: "No FAQ section." });
  }

  // Authority Signals
  const authWords = [
    "years of experience", "certified", "licensed", "award", "featured in",
    "trusted by", "clients served", "established", "since 20", "founded in",
  ];
  const authCount = authWords.filter((w) => bodyText.includes(w)).length;
  if (authCount >= 3) {
    checks.push({ id: "authority-signals", title: "Authority Signals", category: "AEO", status: "pass", message: `${authCount} authority signals.` });
  } else if (authCount >= 1) {
    checks.push({ id: "authority-signals", title: "Authority Signals", category: "AEO", status: "warn", message: `${authCount} signal(s).` });
  } else {
    checks.push({ id: "authority-signals", title: "Authority Signals", category: "AEO", status: "fail", message: "No authority signals." });
  }

  // Clear CTAs
  const ctaWords = [
    "contact us", "get started", "book a call", "schedule",
    "request a quote", "free consultation", "sign up", "get in touch",
  ];
  const ctaCount = ctaWords.filter((w) => bodyText.includes(w)).length;
  if (ctaCount > 0) {
    checks.push({ id: "clear-ctas", title: "Clear CTAs", category: "AEO", status: "pass", message: `${ctaCount} CTAs found.`, impact: 1 });
  } else {
    checks.push({ id: "clear-ctas", title: "Clear CTAs", category: "AEO", status: "warn", message: "No clear CTAs.", impact: 1 });
  }

  // Location Signals
  const locInd = ["located in", "serving", "based in", "our office", "our location", "visit us", "area served"];
  const jsonLdHasLocation = (() => {
    const blocks: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() ?? "");
        blocks.push(data);
        if (Array.isArray(data["@graph"])) data["@graph"].forEach((b: any) => blocks.push(b));
      } catch {}
    });
    return blocks.some((b) => b.address || b.areaServed || b.location);
  })();
  const majorCities = [
    "montreal", "toronto", "vancouver", "calgary", "ottawa", "quebec city", "laval", "longueuil",
    "new york", "los angeles", "chicago", "london", "paris", "austin", "miami", "seattle", "boston", "san francisco",
  ];
  const hasCityMention = majorCities.some((c) => bodyText.includes(c));
  if (locInd.some((l) => bodyText.includes(l)) || jsonLdHasLocation || hasCityMention) {
    checks.push({ id: "location-signals", title: "Location Signals", category: "AEO", status: "pass", message: "Location signals found." });
  } else {
    checks.push({ id: "location-signals", title: "Location Signals", category: "AEO", status: "warn", message: "No location mentions." });
  }

  // Topical Focus
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const titleText = $("title").text() || "";
  if ((titleText + metaDesc + ($("h1").first().text() || "")).length > 20) {
    checks.push({ id: "topical-focus", title: "Topical Focus", category: "AEO", status: "pass", message: "Strong topical signals." });
  } else {
    checks.push({ id: "topical-focus", title: "Topical Focus", category: "AEO", status: "warn", message: "Weak topical signals." });
  }

  // Content Originality
  const boiler = ["lorem ipsum", "coming soon", "under construction", "placeholder —", "placeholder -"];
  if (boiler.some((b) => bodyText.includes(b))) {
    checks.push({ id: "content-originality", title: "Content Originality", category: "AEO", status: "fail", message: "Placeholder content detected.", impact: 5 });
  } else {
    checks.push({ id: "content-originality", title: "Content Originality", category: "AEO", status: "pass", message: "No boilerplate content.", impact: 5 });
  }

  // Semantic HTML
  const semTags = ["article", "section", "aside", "nav", "main", "header", "footer"];
  let semCount = 0;
  for (const tag of semTags) if ($(tag).length > 0) semCount++;
  if (semCount >= 4) {
    checks.push({ id: "semantic-html", title: "Semantic HTML", category: "AEO", status: "pass", message: `${semCount} semantic elements.`, impact: 1 });
  } else if (semCount >= 2) {
    checks.push({ id: "semantic-html", title: "Semantic HTML", category: "AEO", status: "warn", message: `${semCount} semantic elements.`, impact: 1 });
  } else {
    checks.push({ id: "semantic-html", title: "Semantic HTML", category: "AEO", status: "fail", message: "No semantic HTML.", impact: 1 });
  }

  // External Authority Links — entity grounding for LLMs
  const authorityDomains = [
    "wikipedia.org", "wikidata.org", "dbpedia.org", "schema.org", "w3.org",
    "acm.org", "ieee.org", "nature.com", "science.org", "arxiv.org",
    "nih.gov", "cdc.gov", "fda.gov", "sec.gov", "uscourts.gov",
    "statcan.gc.ca", "ic.gc.ca", "canada.ca", "gc.ca",
    "harvard.edu", "mit.edu", "stanford.edu",
  ];
  const authorityTlds = [".gov", ".edu", ".ac.uk", ".gc.ca"];
  let authorityCount = 0;
  const authorityHosts = new Set<string>();
  $("a[href]").each((_, a) => {
    const href = ($(a).attr("href") || "").toLowerCase();
    if (!href.startsWith("http")) return;
    try {
      const host = new URL(href).hostname.replace(/^www\./, "");
      if (authorityDomains.some((d) => host === d || host.endsWith("." + d))) {
        authorityCount++;
        authorityHosts.add(host);
      } else if (authorityTlds.some((t) => host.endsWith(t))) {
        authorityCount++;
        authorityHosts.add(host);
      }
    } catch {}
  });
  if (authorityCount >= 3) {
    checks.push({ id: "external-authority-links", title: "External Authority Links", category: "AEO", status: "pass", message: `${authorityCount} authority link(s) to: ${[...authorityHosts].slice(0, 4).join(", ")}.` });
  } else if (authorityCount >= 1) {
    checks.push({ id: "external-authority-links", title: "External Authority Links", category: "AEO", status: "warn", message: `Only ${authorityCount} authority link(s). LLMs weight entity-grounded content more.` });
  } else {
    checks.push({ id: "external-authority-links", title: "External Authority Links", category: "AEO", status: "fail", message: "No links to Wikipedia, government, academic, or industry authority sources. Missed entity-grounding opportunity." });
  }

  return checks;
};
