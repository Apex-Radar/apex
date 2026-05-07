import { parseFlags, resolveUrl } from "./_flags.js";
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
        "Local audit needs a URL. Try: apex visibility example.com  (or --url https://example.com).  Or set a Radar workspace token to use the hosted audit.",
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
      "  apex visibility <url>    target URL for local audit (positional, no flag needed)\n" +
      "  --url <url>              same, via flag\n" +
      "  --local                  force local audit even if a Radar token is set\n" +
      "  --json                   machine-readable output\n" +
      "\n" +
      "Bare domains work too: apex visibility example.com (https:// auto-prepended).",
    );
    return 0;
  }
  const out = await visibility({
    url: resolveUrl(f),
    json: f.json,
    local: Boolean(f.options.local),
    workspace: f.options.workspace as string | undefined,
  });
  console.log(out);
  return 0;
}
