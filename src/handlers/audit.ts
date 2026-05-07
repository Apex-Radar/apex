import { parseFlags, emit, requireToken, RADAR_BASE, resolveUrl } from "./_flags.js";
import { keys } from "../core/keys/manager.js";
import { RadarAuditClient } from "../radar/audit-client.js";

export async function run(argv: string[]): Promise<number> {
  const f = parseFlags(argv);
  if (f.help) {
    console.log(
      "apex audit — kick off a fresh Radar AEO scan\n" +
      "  apex audit <url>   target URL (positional)\n" +
      "  --url <url>        same, via flag\n" +
      "  --json\n" +
      "\n" +
      "Bare domains work: apex audit example.com (https:// auto-prepended). Defaults to the workspace site if no URL given.",
    );
    return 0;
  }
  const token = await requireToken(keys);
  const client = new RadarAuditClient({ baseUrl: RADAR_BASE, portalToken: token });
  const res = await client.runScan(resolveUrl(f));
  emit(f.json, res, () => `Scan queued. scanId=${res.scanId}\nCheck Radar dashboard or run: apex visibility`);
  return 0;
}
