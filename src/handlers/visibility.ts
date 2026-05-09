import { parseFlags, resolveUrl } from "./_flags.js";
import { renderScoreCard } from "../core/render/score-card.js";
import { runLocalAudit, applyInlineProbeResults } from "../local-audit/index.js";
import { keys } from "../core/keys/manager.js";
import {
  runOpenAiProbe,
  probeResultToChecks,
  logProbeToLedger,
  type OpenAiProbeResult,
} from "../byok/openai-visibility-probe.js";
import {
  runAnthropicProbe,
  anthropicProbeToChecks,
  logAnthropicProbeToLedger,
  type AnthropicProbeResult,
} from "../byok/anthropic-visibility-probe.js";
import {
  runPerplexityProbe,
  perplexityProbeToChecks,
  logPerplexityProbeToLedger,
  type PerplexityProbeResult,
} from "../byok/perplexity-visibility-probe.js";
import { compositeChecks } from "../byok/composite-checks.js";
import { estimateProbe } from "../core/cost/estimator.js";
import type { AuditCheck, AuditResult } from "../radar/types.js";

// v0.2.1 BYOK story (now fully wired):
//   • Local Cheerio audit always runs first — works offline, no key needed.
//   • For each configured BYOK key (openai, anthropic, perplexity), one
//     probe call goes out in parallel. The single response per provider
//     fills its citation-stub slots with graded versions.
//   • With ALL THREE keys configured: 13/13 stubs flip to graded → AEO
//     renders /100 and aeoCeiling drops off the result.
//   • With one or two keys: provider-specific stubs grade; composite
//     slots (multi-provider, ai-readiness-composite, etc.) stay skipped
//     until ≥2 providers are present.
//   • The aeoCeiling field is data-driven: it tracks reality of grading,
//     not user intent. Keys configured but probes failed → ceiling stays
//     at /75 honestly.

export interface VisibilityFlags {
  url?: string;
  json?: boolean;
  query?: string;
  brand?: string;
  noProbes?: boolean;
}

interface ProbeOutcome {
  graded: AuditCheck[];
  estimatedUsd: number;
  failureNote?: string;
  openaiResult?: OpenAiProbeResult;
  anthropicResult?: AnthropicProbeResult;
  perplexityResult?: PerplexityProbeResult;
  /** Providers whose key was configured (regardless of probe success). */
  providersConfigured: string[];
  /** Providers whose probe succeeded. */
  providersSucceeded: string[];
}

/** Derive a brand string from URL hostname when --brand wasn't passed. */
function deriveBrand(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const root = host.split(".")[0];
    return root.charAt(0).toUpperCase() + root.slice(1);
  } catch {
    return "the brand";
  }
}

function deriveDomain(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

async function runAllProbes(args: {
  url: string;
  brand: string;
  query: string;
}): Promise<ProbeOutcome> {
  const [openaiKey, anthropicKey, perplexityKey] = await Promise.all([
    keys.get("openai"),
    keys.get("anthropic"),
    keys.get("perplexity"),
  ]);

  const failures: string[] = [];
  let totalUsd = 0;
  const graded: AuditCheck[] = [];
  let openaiResult: OpenAiProbeResult | undefined;
  let anthropicResult: AnthropicProbeResult | undefined;
  let perplexityResult: PerplexityProbeResult | undefined;
  const providersConfigured: string[] = [];
  const providersSucceeded: string[] = [];

  const tasks: Promise<void>[] = [];

  if (openaiKey) providersConfigured.push("openai");
  if (anthropicKey) providersConfigured.push("anthropic");
  if (perplexityKey) providersConfigured.push("perplexity");

  if (openaiKey) {
    tasks.push(
      (async () => {
        try {
          openaiResult = await runOpenAiProbe({
            apiKey: openaiKey,
            query: args.query,
            brand: args.brand,
          });
          graded.push(...probeResultToChecks(openaiResult, args.brand));
          const est = estimateProbe({
            provider: "openai",
            queries: 1,
            avgInputTokens: 60,
            avgOutputTokens: 350,
          });
          await logProbeToLedger(openaiResult, {
            inputTokens: est.inputTokens,
            outputTokens: est.outputTokens,
          });
          totalUsd += openaiResult.estimatedUsd;
          providersSucceeded.push("openai");
        } catch (err: any) {
          failures.push(`openai: ${err?.message ?? err}`);
        }
      })(),
    );
  }

  if (anthropicKey) {
    tasks.push(
      (async () => {
        try {
          anthropicResult = await runAnthropicProbe({
            apiKey: anthropicKey,
            query: args.query,
            brand: args.brand,
          });
          graded.push(...anthropicProbeToChecks(anthropicResult, args.brand));
          const est = estimateProbe({
            provider: "anthropic",
            queries: 1,
            avgInputTokens: 60,
            avgOutputTokens: 350,
          });
          await logAnthropicProbeToLedger(anthropicResult, {
            inputTokens: est.inputTokens,
            outputTokens: est.outputTokens,
          });
          totalUsd += anthropicResult.estimatedUsd;
          providersSucceeded.push("anthropic");
        } catch (err: any) {
          failures.push(`anthropic: ${err?.message ?? err}`);
        }
      })(),
    );
  }

  if (perplexityKey) {
    tasks.push(
      (async () => {
        try {
          perplexityResult = await runPerplexityProbe({
            apiKey: perplexityKey,
            query: args.query,
            brand: args.brand,
            domain: deriveDomain(args.url),
          });
          graded.push(...perplexityProbeToChecks(perplexityResult, args.brand));
          const est = estimateProbe({
            provider: "perplexity",
            queries: 1,
            avgInputTokens: 60,
            avgOutputTokens: 350,
          });
          await logPerplexityProbeToLedger(perplexityResult, {
            inputTokens: est.inputTokens,
            outputTokens: est.outputTokens,
          });
          totalUsd += perplexityResult.estimatedUsd;
          providersSucceeded.push("perplexity");
        } catch (err: any) {
          failures.push(`perplexity: ${err?.message ?? err}`);
        }
      })(),
    );
  }

  await Promise.all(tasks);

  // Composite slots — only built when ≥2 providers actually returned data.
  graded.push(
    ...compositeChecks(
      { openai: openaiResult, anthropic: anthropicResult, perplexity: perplexityResult },
      args.brand,
    ),
  );

  return {
    graded,
    estimatedUsd: totalUsd,
    failureNote: failures.length ? failures.join("; ") : undefined,
    openaiResult,
    anthropicResult,
    perplexityResult,
    providersConfigured,
    providersSucceeded,
  };
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

  // Step 1: always run the local Cheerio audit. This is the free,
  // offline, no-API-call backbone.
  const audit: AuditResult = await runLocalAudit({ url: flags.url });

  // Step 2: BYOK probes (when keys configured + --no-probes not set).
  let probeNote = "";

  if (!flags.noProbes) {
    const brand = flags.brand ?? deriveBrand(flags.url);
    const query = flags.query ?? brand;
    const outcome = await runAllProbes({ url: flags.url, brand, query });

    if (outcome.providersConfigured.length || outcome.failureNote) {
      applyInlineProbeResults(audit, outcome.graded);
      const noteLines: string[] = [];
      if (outcome.providersSucceeded.length) {
        noteLines.push(
          `BYOK probes ran for query "${query}" against brand "${brand}".`,
          `Providers used: ${outcome.providersSucceeded.join(", ")}. ` +
            `Filled ${outcome.graded.length} of 13 citation slots. ` +
            `Estimated cost: $${outcome.estimatedUsd.toFixed(4)}.`,
        );
      }
      if (outcome.failureNote) {
        noteLines.push(`Probe failures: ${outcome.failureNote}`);
      }
      const missing = ["openai", "anthropic", "perplexity"].filter(
        (p) => !outcome.providersConfigured.includes(p),
      );
      if (missing.length && outcome.graded.length < 13) {
        noteLines.push(
          `Configure ${missing.join(", ")} (apex keys set <provider> <key>) to fill the remaining slots.`,
        );
      }
      probeNote = "\n" + noteLines.join("\n");
    }
  }

  if (flags.json) return JSON.stringify(audit, null, 2);
  let out = renderScoreCard(audit);
  if (probeNote) out += `\n\x1b[2m${probeNote}\x1b[0m`;
  return out;
}

export async function run(argv: string[]): Promise<number> {
  const f = parseFlags(argv);
  if (f.help) {
    console.log(
      "apex visibility — score AAIV + AEO posture for any URL\n" +
      "  apex visibility <url>    target URL (positional, no flag needed)\n" +
      "  --url <url>              same, via flag\n" +
      "  --query <q>              query to probe AI engines for (default: brand name)\n" +
      "  --brand <name>           brand to look for in AI responses (default: derived from URL)\n" +
      "  --no-probes              skip BYOK probes even if keys are configured\n" +
      "  --json                   machine-readable output\n" +
      "\n" +
      "Bare domains work too: apex visibility example.com (https:// auto-prepended).\n" +
      "\n" +
      "AAIV is the Apex AI Visibility metric — a 0–100 score for how ready\n" +
      "your site is to be cited by AI engines (ChatGPT, Claude, Perplexity, Gemini).\n" +
      "Free local audit caps AEO at /75 (the 13 live citation slots stay skipped).\n" +
      "Configure BYOK keys with `apex keys set openai|anthropic|perplexity <key>`\n" +
      "to fill the citation slots automatically — with all three configured the\n" +
      "AEO score renders against the full /100 scale. Keys never leave your\n" +
      "machine; you pay providers directly.\n" +
      "\n" +
      "Built by Apex Radar · https://getapexradar.com",
    );
    return 0;
  }
  const out = await visibility({
    url: resolveUrl(f),
    json: f.json,
    query: f.options.query as string | undefined,
    brand: f.options.brand as string | undefined,
    noProbes: Boolean(f.options["no-probes"]),
  });
  console.log(out);
  return 0;
}
