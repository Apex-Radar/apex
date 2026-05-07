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
  const resp = await client.getAnswerGap();
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
