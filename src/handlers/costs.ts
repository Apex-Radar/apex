import { parseFlags, emit } from "./_flags.js";
import { readLedger, summarize } from "../core/cost/ledger.js";

export async function run(argv: string[]): Promise<number> {
  const f = parseFlags(argv);
  if (f.help) {
    console.log("apex costs — show local BYOK cost ledger\n  --tail <n>   recent entries (default 20)\n  --json");
    return 0;
  }
  const tail = Number(f.options.tail ?? 20);
  const entries = await readLedger(1000);
  const summary = summarize(entries);
  const recent = entries.slice(-tail);

  emit(f.json, { summary, recent }, () => {
    const lines = [
      `BYOK ledger — ${summary.count} entries, total $${summary.totalUsd.toFixed(4)}`,
      "",
      "By provider:",
      ...Object.entries(summary.byProvider).map(([k, v]) => `  ${k.padEnd(12)} $${v.toFixed(4)}`),
      "",
      "By operation:",
      ...Object.entries(summary.byOperation).map(([k, v]) => `  ${k.padEnd(20)} $${v.toFixed(4)}`),
      "",
      `Recent ${recent.length}:`,
      ...recent.map((e) => `  ${e.ts}  ${e.provider.padEnd(10)} ${e.operation.padEnd(18)} $${e.estimatedUsd.toFixed(4)}`),
    ];
    return lines.join("\n");
  });
  return 0;
}
