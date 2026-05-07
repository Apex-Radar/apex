// BYOK ad-hoc citation probe. Uses the user's own provider keys.
// Apex never proxies — we call the provider's public API directly with the user's key.

import { parseFlags, emit } from "./_flags.js";
import { keys, type ProviderId } from "../core/keys/manager.js";
import { estimateProbe } from "../core/cost/estimator.js";
import { appendLedger } from "../core/cost/ledger.js";

interface ProbeOutcome {
  provider: ProviderId;
  query: string;
  cited: boolean;
  mentioned: boolean;
  excerpt: string;
  estimatedUsd: number;
}

async function probeOpenAi(apiKey: string, query: string, brand: string): Promise<Omit<ProbeOutcome, "provider" | "estimatedUsd">> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: query }],
      max_tokens: 400,
    }),
  });
  if (!r.ok) throw new Error(`openai ${r.status}: ${await r.text()}`);
  const j: any = await r.json();
  const text: string = j?.choices?.[0]?.message?.content ?? "";
  const lower = text.toLowerCase();
  const b = brand.toLowerCase();
  return {
    query,
    cited: lower.includes(b) && /https?:\/\/[^\s)]+/i.test(text),
    mentioned: lower.includes(b),
    excerpt: text.slice(0, 280),
  };
}

export async function run(argv: string[]): Promise<number> {
  const f = parseFlags(argv);
  if (f.help) {
    console.log(
      "apex citation — BYOK ad-hoc citation probe\n" +
      "  --provider <id>   openai (more providers in upcoming releases)\n" +
      "  --query <q>       query to probe (repeatable; or pass --queries-file)\n" +
      "  --brand <name>    brand name to match (required)\n" +
      "  --queries-file <path>  newline-separated queries\n" +
      "  --json",
    );
    return 0;
  }

  const provider = ((f.options.provider as string) || "openai") as ProviderId;
  const brand = f.options.brand as string;
  if (!brand) { console.error("--brand is required"); return 2; }

  const queries: string[] = [];
  if (typeof f.options.query === "string") queries.push(f.options.query);
  if (typeof f.options["queries-file"] === "string") {
    const fs = await import("node:fs/promises");
    const raw = await fs.readFile(f.options["queries-file"] as string, "utf8");
    queries.push(...raw.split("\n").map((s) => s.trim()).filter(Boolean));
  }
  if (queries.length === 0) { console.error("No queries supplied"); return 2; }

  const apiKey = await keys.get(provider);
  if (!apiKey) { console.error(`No ${provider} key. Run: apex keys set ${provider} <key>`); return 2; }

  const results: ProbeOutcome[] = [];
  for (const q of queries) {
    const est = estimateProbe({ provider, queries: 1, avgInputTokens: 60, avgOutputTokens: 350 });
    let outcome: ProbeOutcome;
    if (provider === "openai") {
      const res = await probeOpenAi(apiKey, q, brand);
      outcome = { provider, ...res, estimatedUsd: est.estimatedUsd };
    } else {
      console.error(`Provider ${provider} not yet implemented in this release.`);
      return 2;
    }
    results.push(outcome);
    await appendLedger({
      ts: new Date().toISOString(),
      provider,
      operation: "citation-probe",
      inputTokens: est.inputTokens,
      outputTokens: est.outputTokens,
      estimatedUsd: est.estimatedUsd,
      notes: q.slice(0, 80),
    });
  }

  const cited = results.filter((r) => r.cited).length;
  const mentioned = results.filter((r) => r.mentioned).length;
  const totalUsd = results.reduce((s, r) => s + r.estimatedUsd, 0);

  emit(f.json, { provider, brand, results, summary: { cited, mentioned, total: results.length, totalUsd } }, () => {
    const lines = [`Citation probe — ${provider} — ${brand}`, `Cited ${cited}/${results.length}, mentioned ${mentioned}/${results.length}, est $${totalUsd.toFixed(4)}`, ""];
    for (const r of results) {
      const mark = r.cited ? "✓" : r.mentioned ? "~" : "·";
      lines.push(`  ${mark} ${r.query}`);
      if (r.excerpt) lines.push(`      ${r.excerpt.replace(/\s+/g, " ").slice(0, 160)}…`);
    }
    return lines.join("\n");
  });
  return 0;
}
