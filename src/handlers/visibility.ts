import { parseFlags } from "./_flags.js";
import { renderScoreCard } from "../core/render/score-card.js";
import { runLocalAudit } from "../local-audit/index.js";
import { fetchLatestAudit } from "../radar/audit-client.js";
import { getRadarPortalToken } from "../core/keys/manager.js";
import type { AuditResult } from "../radar/types.js";

export interface VisibilityFlags {
  url?: string;
  json?: boolean;
  local?: boolean;
  workspace?: string;
}

export async function visibility(flags: VisibilityFlags): Promise<string> {
  const token = flags.workspace ?? (await getRadarPortalToken());
  const useRadar = !flags.local && Boolean(token);

  let result: AuditResult;
  if (useRadar) {
    const wrapper = await fetchLatestAudit(token!);
    result = wrapper.result;
  } else {
    if (!flags.url) {
      throw new Error(
        "Local audit needs --url <https://...>.  (Or set a Radar workspace token to use the hosted audit.)",
      );
    }
    result = await runLocalAudit({ url: flags.url });
  }

  if (flags.json) return JSON.stringify(result, null, 2);
  return renderScoreCard(result);
}

export async function run(argv: string[]): Promise<number> {
  const f = parseFlags(argv);
  if (f.help) {
    console.log(
      "apex visibility — show AAIV + AEO posture\n" +
      "  --url <url>    target URL for local audit (no Radar token required)\n" +
      "  --local        force local audit even if a Radar token is set\n" +
      "  --json         machine-readable output",
    );
    return 0;
  }
  const out = await visibility({
    url: f.options.url as string | undefined,
    json: f.json,
    local: Boolean(f.options.local),
    workspace: f.options.workspace as string | undefined,
  });
  console.log(out);
  return 0;
}
