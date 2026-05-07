import { parseFlags, emit, requireToken, RADAR_BASE } from "./_flags.js";
import { keys } from "../core/keys/manager.js";
import { RadarAivClient } from "../radar/aiv-client.js";
import { rankGaps, planBriefs } from "../workflow/answer-gap.js";

export async function run(argv: string[]): Promise<number> {
  const f = parseFlags(argv);
  if (f.help) {
    console.log(
      "apex gaps — list Answer Gap rows, ranked\n" +
      "  --briefs       also emit brief specs for top 5\n" +
      "  --max <n>      limit rows shown (default 20)\n" +
      "  --json         machine-readable output",
    );
    return 0;
  }
  const token = await requireToken(keys);
  const client = new RadarAivClient({ baseUrl: RADAR_BASE, portalToken: token });
  let resp;
  try {
    resp = await client.getAnswerGap();
  } catch (err) {
    const msg = (err as Error).message ?? "";
    // 404 = route not provisioned. HTML response (DOCTYPE / JSON parse fail) =
    // proxy served the marketing site instead of the API route — same root cause:
    // the Answer Gap module isn't enabled on this Radar workspace.
    if (/\b404\b/.test(msg) || /<!DOCTYPE|Unexpected token '<'/.test(msg)) {
      const lines = [
        "Answer Gap data isn't available on this Radar workspace.",
        "",
        "Answer Gap is a separate Radar Portal feature, not part of the AIV scan.",
        "It ranks queries where AI engines cite competitors instead of you.",
        "",
        "Free alternatives you can run right now:",
        "  • apex visibility <url>           full SEO + AEO scorecard",
        "  • apex citation \"<query>\"         BYOK probe (needs OPENAI_API_KEY,",
        "                                    ANTHROPIC_API_KEY, or PERPLEXITY_API_KEY)",
        "",
        "To enable Answer Gap on your workspace: https://getapexradar.com",
      ];
      if (f.json) {
        emit(true, { error: "answer_gap_not_enabled", message: lines[0], help: lines.slice(2).join("\n") }, () => "");
      } else {
        console.log(lines.join("\n"));
      }
      return 2;
    }
    throw err;
  }
  const max = Number(f.options.max ?? 20);
  const ranked = rankGaps(resp.rows).slice(0, max);
  const briefs = f.options.briefs ? planBriefs(resp, 5) : undefined;

  emit(f.json, { scannedAt: resp.scannedAt, rows: ranked, briefs }, () => {
    const lines: string[] = [`Answer Gap — ${resp.scannedAt}`];
    for (const r of ranked) {
      const mark = r.cited ? "✓" : r.competitorsCited.length ? "✗" : "·";
      const rate = (r.mentionRate * 100).toFixed(0) + "%";
      lines.push(`  ${mark} [${r.engine}] ${r.query}  (mention ${rate}${r.competitorsCited.length ? `, comp: ${r.competitorsCited.slice(0,3).join(", ")}` : ""})`);
    }
    if (briefs) {
      lines.push("", "Top brief specs:");
      for (const b of briefs) lines.push(`  • ${b.angle}`);
    }
    return lines.join("\n");
  });
  return 0;
}
