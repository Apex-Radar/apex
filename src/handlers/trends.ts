import { parseFlags, emit, requireToken, RADAR_BASE } from "./_flags.js";
import { keys } from "../core/keys/manager.js";
import { RadarAivClient } from "../radar/aiv-client.js";

export async function run(argv: string[]): Promise<number> {
  const f = parseFlags(argv);
  if (f.help) {
    console.log("apex trends — visibility over time\n  --json");
    return 0;
  }
  const token = await requireToken(keys);
  const client = new RadarAivClient({ baseUrl: RADAR_BASE, portalToken: token });
  const points = await client.getTrend();
  emit(f.json, points, () => {
    const lines = ["AIV trend (filled = official scan, hollow = comparison):"];
    for (const p of points) {
      const mark = p.filled ? "●" : "○";
      lines.push(`  ${p.scannedAt}  ${mark}  ${p.visibilityScore.toFixed(1)}/10`);
    }
    return lines.join("\n");
  });
  return 0;
}
