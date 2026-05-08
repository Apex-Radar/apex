import { parseFlags, resolveUrl } from "./_flags.js";
import { renderScoreCard } from "../core/render/score-card.js";
import { runLocalAudit } from "../local-audit/index.js";
import { fetchLatestAudit } from "../radar/audit-client.js";
import { getRadarPortalToken } from "../core/keys/manager.js";
import type { AuditResult } from "../radar/types.js";

// NOTE: an earlier iteration of this handler detected BYOK keys (OpenAI /
// Anthropic / Perplexity) and flipped a `byokMode` flag that suppressed the
// 13 citation stubs from the local audit. That was wrong: a configured key
// is not the same as a citation probe having actually run. Without inline
// probe integration, "BYOK mode" silently dropped 13 checks from the
// denominator → score reverted to the pre-fix inflated number. Same
// dishonest-denominator bug, different label.
//
// Correct model: the AEO ceiling reflects ACTUAL grading state, not user
// intent. Stubs stay `skipped` until probes graded them (via inline run or
// `apex citation` write-back). The renderer drives the mode switch off
// `aeoCeiling`, which `runLocalAudit` derives from the live skipped count.
// Key presence alone never flips the display.
//
// When inline citation probes are wired up (forward-compat hook in
// `runLocalAudit` is `inlineCitationProbes`), this handler will run them
// before invoking the audit and pass `inlineCitationProbes: true` so stubs
// are replaced with graded results instead of skipped.

export interface VisibilityFlags {
  url?: string;
  json?: boolean;
  local?: boolean;
  workspace?: string;
}

export async function visibility(flags: VisibilityFlags): Promise<string> {
  const token = flags.workspace ?? (await getRadarPortalToken());

  // Routing rule (v0.1.6+):
  //   • URL passed (positional or --url) → ALWAYS run local audit on that URL.
  //     Without this, a configured Radar token silently overrides the URL and
  //     dumps the workspace's last cached scan instead of scanning what the
  //     user typed. People should be able to scan as many URLs as they want.
  //   • No URL + Radar token → fetch the workspace's latest audit (Radar mode).
  //   • No URL + no token → friendly error with usage hint.
  //   • --local explicit → force local audit even if a token is set (this
  //     case still requires a URL — error out otherwise).
  const userPassedUrl = Boolean(flags.url);
  const useRadar = !flags.local && !userPassedUrl && Boolean(token);

  let result: AuditResult;
  if (useRadar) {
    const wrapper = await fetchLatestAudit(token!);
    result = wrapper.result;
  } else {
    if (!flags.url) {
      throw new Error(
        "apex visibility needs a URL.\n" +
        "  apex visibility example.com\n" +
        "  apex visibility example.com --local\n" +
        "  apex visibility --url https://example.com\n" +
        "If you have a Radar workspace token configured, running `apex visibility` with NO URL fetches your workspace's latest audit.",
      );
    }
    result = await runLocalAudit({ url: flags.url });
  }

  if (flags.json) return JSON.stringify(result, null, 2);
  let out = renderScoreCard(result);
  // Heads-up when a Radar token IS configured but we went local because the
  // user passed a URL. Avoids the user thinking their token isn't working.
  if (token && !flags.local && userPassedUrl) {
    out += "\n\n\x1b[2mNote: scanning " + flags.url + " in local mode (capped scoring). To grade this URL with full Radar coverage, scan it from app.getapexradar.com.\x1b[0m";
  }
  return out;
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
