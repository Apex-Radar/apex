// Ensure AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.)
// are explicitly allowed in robots.txt. Adds a clearly-marked Apex block;
// preserves existing robots.txt content.

import path from "node:path";
import { promises as fs } from "node:fs";
import type { Fixer, FixerContext, FixerResult, ChangeRecord } from "../_contract.js";
import { writeFile, readIfExists } from "../_contract.js";

const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Bytespider",
  "Applebot-Extended",
  "CCBot",
  "Meta-ExternalAgent",
  "Amazonbot",
  "DuckAssistBot",
  "cohere-ai",
];

const APEX_MARK_START = "# >>> apex:ai-crawler-access — managed block — do not edit between markers";
const APEX_MARK_END   = "# <<< apex:ai-crawler-access";

function buildBlock(): string {
  const lines: string[] = [APEX_MARK_START];
  for (const bot of AI_BOTS) {
    lines.push(`User-agent: ${bot}`);
    lines.push("Allow: /");
    lines.push("");
  }
  lines.push(APEX_MARK_END);
  return lines.join("\n") + "\n";
}

function spliceBlock(existing: string, block: string): string {
  const startIdx = existing.indexOf(APEX_MARK_START);
  if (startIdx === -1) {
    return (existing.trimEnd() + "\n\n" + block).replace(/\n{3,}/g, "\n\n");
  }
  const endIdx = existing.indexOf(APEX_MARK_END, startIdx);
  if (endIdx === -1) return existing.trimEnd() + "\n\n" + block;
  const before = existing.slice(0, startIdx);
  const afterRaw = existing.slice(endIdx + APEX_MARK_END.length);
  // Consume the newline that terminates the end-marker line so block's own trailing \n is canonical.
  const after = afterRaw.startsWith("\n") ? afterRaw.slice(1) : afterRaw;
  return (before + block + after).replace(/\n{3,}/g, "\n\n");
}

function pickRobotsPath(rootDir: string, framework: string): string {
  switch (framework) {
    case "nextjs":      return "public/robots.txt";
    case "astro":       return "public/robots.txt";
    case "wordpress":   return "robots.txt";
    case "static-html": return "robots.txt";
    default:            return "public/robots.txt";
  }
}

const fixer: Fixer = {
  id: "ai-crawler-access",
  title: "Allow AI crawlers in robots.txt",
  description:
    "Explicitly allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended and the major AI crawlers. " +
    "Many sites block these by default via inherited rules — this is the most common AAIV recovery fix.",
  appliesTo: "all",

  async apply(ctx: FixerContext): Promise<FixerResult> {
    const rel = pickRobotsPath(ctx.rootDir, ctx.framework);
    const abs = path.join(ctx.rootDir, rel);
    const existing = (await readIfExists(abs)) ?? "";

    const block = buildBlock();
    const next = existing ? spliceBlock(existing, block) : block;

    const changes: ChangeRecord[] = [];
    const notes: string[] = [];

    if (next === existing) {
      changes.push({ action: "noop", path: rel, reason: "already up to date" });
    } else {
      changes.push(await writeFile(ctx.rootDir, rel, next, ctx.dryRun));
    }

    notes.push("Verify production deploy serves /robots.txt with these rules.");
    notes.push("If your CDN or framework injects its own robots.txt, mirror this block there too.");
    if (ctx.framework === "wordpress") {
      notes.push("WordPress: if a SEO plugin (Yoast/Rank Math) manages robots, paste the apex block into its robots.txt editor.");
    }

    return {
      ok: true,
      summary: `${ctx.framework} → ${rel}: ${changes[0].action}`,
      changes,
      notes,
    };
  },
};

export default fixer;
export const apply = fixer.apply.bind(fixer);
