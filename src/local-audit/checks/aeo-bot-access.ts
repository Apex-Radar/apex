/**
 * AEO bot-access + llms.txt checks — parity-faithful port of
 * `apex-worker-do/src/checks/aeo-checks.js` lines 217-244 + isBotDisallowed helper (124-165)
 * + validateLlmsTxt helper (168-177).
 *
 * Note on free audit naming: the free audit emits `${bot.label} Access` where
 * label is "GPTBot (OpenAI)" etc. We match those exact strings.
 */
import type { AuditCheck } from "../../radar/types.js";
import type { LocalCheckRunner } from "../types.js";

interface BotDisallowResult {
  disallowed: boolean;
  reason: string;
}

function isBotDisallowed(robotsRaw: string | null, botName: string): BotDisallowResult {
  if (!robotsRaw) return { disallowed: false, reason: "no robots.txt (default-allow)" };
  const lines = robotsRaw.split(/\r?\n/).map((l) => l.trim());
  const lowerBot = botName.toLowerCase();

  let currentAgents: string[] = [];
  let specificBlock: { disallows: string[]; allows: string[] } | null = null;
  let wildcardBlock: { disallows: string[]; allows: string[] } | null = null;
  let block: { disallows: string[]; allows: string[] } | null = null;

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const [keyRaw, ...rest] = line.split(":");
    const key = keyRaw.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (block) {
        if (currentAgents.includes(lowerBot) && !specificBlock) specificBlock = block;
        if (currentAgents.includes("*") && !wildcardBlock) wildcardBlock = block;
        currentAgents = [];
      }
      currentAgents.push(value.toLowerCase());
      block = { disallows: [], allows: [] };
    } else if (key === "disallow" && block) {
      block.disallows.push(value);
    } else if (key === "allow" && block) {
      block.allows.push(value);
    }
  }
  if (block) {
    if (currentAgents.includes(lowerBot) && !specificBlock) specificBlock = block;
    if (currentAgents.includes("*") && !wildcardBlock) wildcardBlock = block;
  }

  const applicable = specificBlock || wildcardBlock;
  if (!applicable) return { disallowed: false, reason: "no matching rule" };
  const blocksRoot =
    applicable.disallows.some((d) => d === "/" || d === "/*") &&
    !applicable.allows.some((a) => a === "/" || a === "/*");
  return {
    disallowed: blocksRoot,
    reason: blocksRoot
      ? specificBlock
        ? `explicitly disallowed for ${botName}`
        : "disallowed by User-agent: *"
      : specificBlock
        ? `explicitly allowed for ${botName}`
        : "allowed by default",
  };
}

function validateLlmsTxt(raw: string): { valid: boolean; reason: string } {
  if (!raw || raw.length < 10) return { valid: false, reason: "empty file" };
  const lines = raw.split(/\r?\n/);
  const hasH1 = lines.some((l) => /^#\s+\S/.test(l));
  const hasH2 = lines.some((l) => /^##\s+\S/.test(l));
  const hasLinks = /\[.+\]\(.+\)/.test(raw);
  if (!hasH1) return { valid: false, reason: "missing H1 title (# Title)" };
  if (!hasH2 && !hasLinks) return { valid: false, reason: "no sections (##) or links found" };
  return { valid: true, reason: `valid format (${lines.length} lines, ${raw.length} chars)` };
}

export const aeoBotAccessChecks: LocalCheckRunner = (ctx) => {
  const checks: AuditCheck[] = [];
  const robotsRaw = ctx.robotsTxt;

  const aiBots = [
    { name: "GPTBot",         label: "GPTBot (OpenAI)",                       why: "Used by ChatGPT to index sites for citations.",                                                  impact: 5 },
    { name: "ClaudeBot",      label: "ClaudeBot (Anthropic)",                 why: "Used by Claude to index sites for citations.",                                                   impact: 5 },
    { name: "PerplexityBot",  label: "PerplexityBot",                         why: "Used by Perplexity to index sites for search answers.",                                          impact: 5 },
    { name: "Google-Extended",label: "Google-Extended (Gemini / AI Overviews)", why: "Controls whether Google uses your site for AI Overviews and Gemini training.",               impact: 5 },
    { name: "CCBot",          label: "CCBot (Common Crawl)",                  why: "Common Crawl feeds many open-source LLMs. Blocking it excludes you from those models.",         impact: 3 },
    { name: "Bytespider",     label: "Bytespider (ByteDance / Doubao)",       why: "ByteDance's crawler used to train Doubao and other AI products.",                               impact: 1 },
  ];

  for (const bot of aiBots) {
    const { disallowed, reason } = isBotDisallowed(robotsRaw, bot.name);
    if (disallowed) {
      checks.push({
        id: `${bot.name.toLowerCase()}-access`,
        title: `${bot.label} Access`,
        category: "AEO",
        status: "fail",
        message: `Blocked: ${reason}. ${bot.why}`,
        impact: bot.impact,
      });
    } else {
      checks.push({
        id: `${bot.name.toLowerCase()}-access`,
        title: `${bot.label} Access`,
        category: "AEO",
        status: "pass",
        message: `Allowed (${reason}).`,
        impact: bot.impact,
      });
    }
  }

  // llms.txt Present
  const llmsRaw = ctx.llmsTxt;
  const llmsExists = Boolean(llmsRaw);
  if (llmsExists) {
    checks.push({
      id: "llms-txt-present",
      title: "llms.txt Present",
      category: "AEO",
      status: "pass",
      message: `/llms.txt found (${llmsRaw!.length} chars).`,
    });
  } else {
    checks.push({
      id: "llms-txt-present",
      title: "llms.txt Present",
      category: "AEO",
      status: "warn",
      message: "No /llms.txt found. Emerging standard for LLM-friendly content manifests.",
    });
  }

  // llms.txt Valid
  if (llmsExists) {
    const v = validateLlmsTxt(llmsRaw!);
    if (v.valid) {
      checks.push({ id: "llms-txt-valid", title: "llms.txt Valid", category: "AEO", status: "pass", message: v.reason, impact: 1 });
    } else {
      checks.push({ id: "llms-txt-valid", title: "llms.txt Valid", category: "AEO", status: "warn", message: `Format issue: ${v.reason}. See https://llmstxt.org/`, impact: 1 });
    }
  } else {
    checks.push({ id: "llms-txt-valid", title: "llms.txt Valid", category: "AEO", status: "warn", message: "No llms.txt to validate.", impact: 1 });
  }

  return checks;
};
