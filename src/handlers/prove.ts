import { parseFlags, emit, requireToken, RADAR_BASE } from "./_flags.js";
import { keys } from "../core/keys/manager.js";
import { RadarAivClient } from "../radar/aiv-client.js";
import { compareScans, renderProve } from "../workflow/prove.js";

export async function run(argv: string[]): Promise<number> {
  const f = parseFlags(argv);
  if (f.help) {
    console.log(
      "apex prove — compare two AIV scans (before/after a fix)\n" +
      "  --before <reportId>   defaults to second-most-recent\n" +
      "  --after  <reportId>   defaults to most recent\n" +
      "  --json",
    );
    return 0;
  }
  const token = await requireToken(keys);
  const client = new RadarAivClient({ baseUrl: RADAR_BASE, portalToken: token });
  const scans = await client.getScans();
  if (scans.length < 2) {
    console.error("Need at least 2 AIV scans to prove. Run an AIV scan and try again.");
    return 1;
  }
  const sorted = [...scans].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const afterId = (f.options.after as string) ?? sorted[sorted.length - 1].reportId;
  const beforeId = (f.options.before as string) ?? sorted[sorted.length - 2].reportId;
  const before = scans.find((s) => s.reportId === beforeId);
  const after = scans.find((s) => s.reportId === afterId);
  if (!before || !after) { console.error("before/after reportId not found"); return 2; }

  const delta = compareScans(before.result, after.result);
  emit(f.json, { beforeId, afterId, delta }, () => renderProve(delta));
  return delta.proven ? 0 : 1;
}
