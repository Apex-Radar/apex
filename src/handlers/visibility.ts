import { parseFlags, resolveUrl } from "./_flags.js";
import { renderScoreCard } from "../core/render/score-card.js";
import { runLocalAudit } from "../local-audit/index.js";
import type { AuditResult } from "../radar/types.js";

// Single-mode CLI as of v0.2.0:
//   • URL passed → run the local Cheerio audit on that URL.
//   • No URL → friendly error with usage hint.
// BYOK keys (OpenAI / Anthropic / Perplexity) configured?
//   The audit emits 13 citation `skipped` stubs and the renderer caps AEO
//   at /75 — same in both states today. Inline citation probes (the
//   forward-compat hook `inlineCitationProbes` on `runLocalAudit`) will
//   wire keys → graded checks → /100 in a follow-up release. Until then
//   key presence is honest about not changing the score: stubs only flip
//   to graded when probes have actually run.

export interface VisibilityFlags {
  url?: string;
  json?: boolean;
}

export async function visibility(flags: VisibilityFlags): Promise<string> {
  if (!flags.url) {
    throw new Error(
      "apex visibility needs a URL.\n" +
      "  apex visibility example.com\n" +
      "  apex visibility --url https://example.com\n" +
      "Bare domains work — https:// is auto-prepended.",
    );
  }
  const result: AuditResult = await runLocalAudit({ url: flags.url });
  if (flags.json) return JSON.stringify(result, null, 2);
  return renderScoreCard(result);
}

export async function run(argv: string[]): Promise<number> {
  const f = parseFlags(argv);
  if (f.help) {
    console.log(
      "apex visibility — score AAIV + AEO posture for any URL\n" +
      "  apex visibility <url>    target URL (positional, no flag needed)\n" +
      "  --url <url>              same, via flag\n" +
      "  --json                   machine-readable output\n" +
      "\n" +
      "Bare domains work too: apex visibility example.com (https:// auto-prepended).\n" +
      "\n" +
      "AAIV is the Apex AI Visibility metric — a 0–100 score for how ready\n" +
      "your site is to be cited by AI engines (ChatGPT, Claude, Perplexity, Gemini).\n" +
      "Built by Apex Radar · https://getapexradar.com",
    );
    return 0;
  }
  const out = await visibility({
    url: resolveUrl(f),
    json: f.json,
  });
  console.log(out);
  return 0;
}
