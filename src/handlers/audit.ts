import { parseFlags, emit, requireToken, RADAR_BASE } from "./_flags.js";
import { keys } from "../core/keys/manager.js";
import { RadarAuditClient } from "../radar/audit-client.js";

export async function run(argv: string[]): Promise<number> {
  const f = parseFlags(argv);
  if (f.help) {
    console.log("apex audit — kick off a fresh Radar AEO scan\n  --url <url>   target URL (defaults to workspace site)\n  --json");
    return 0;
  }
  const token = await requireToken(keys);
  const client = new RadarAuditClient({ baseUrl: RADAR_BASE, portalToken: token });
  const res = await client.runScan(f.options.url as string | undefined);
  emit(f.json, res, () => `Scan queued. scanId=${res.scanId}\nCheck Radar dashboard or run: apex visibility`);
  return 0;
}
