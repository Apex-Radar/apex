#!/usr/bin/env node
// Apex CLI — thin command router. Real work lives in src/handlers/*.
// Each handler is loaded lazily so `apex --help` stays fast.

import { APEX_VERSION } from "./index.js";

type Handler = (argv: string[]) => Promise<number>;

const COMMANDS: Record<string, () => Promise<{ run: Handler }>> = {
  visibility: () => import("./handlers/visibility.js"),
  fix:        () => import("./handlers/fix.js"),
  citation:   () => import("./handlers/citation.js"),
  keys:       () => import("./handlers/keys.js"),
  costs:      () => import("./handlers/costs.js"),
};

const HELP = `apex ${APEX_VERSION}  —  AAIV (Apex AI Visibility) for the terminal
Built by Apex Radar · https://getapexradar.com

Usage:
  apex <command> [options]

Commands:
  visibility   Score AAIV + AEO posture for any URL (free local audit; BYOK fills citation slots → /100)
  citation     Ad-hoc citation probe — does ChatGPT / Claude / Perplexity cite your brand for a query? (BYOK)
  fix          Apply a fixable check (schema, llms.txt, crawler access, ...)
  keys         Manage BYOK API keys (keychain or env vars)
  costs        Inspect local BYOK cost ledger

Global flags:
  --json       Machine-readable output
  --help       Show command help
  --version    Print version

AAIV is the Apex AI Visibility metric — created by Apex Radar to score how
ready your site is to be cited by AI engines. The free CLI audit uses
local Cheerio parsing (no API calls). Bring your own LLM keys with
\`apex keys set openai|anthropic|perplexity\` to fill the live citation
checks and unlock the full /100 score. The full product (history,
multi-page audits, competitor monitoring, scheduled scans) lives at
https://getapexradar.com.`;

async function main(argv: string[]): Promise<number> {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    console.log(HELP);
    return 0;
  }
  if (argv[0] === "--version" || argv[0] === "-v") {
    console.log(APEX_VERSION);
    return 0;
  }

  const cmd = argv[0];
  const loader = COMMANDS[cmd];
  if (!loader) {
    console.error(`Unknown command: ${cmd}\n`);
    console.error(HELP);
    return 2;
  }

  try {
    const mod = await loader();
    return await mod.run(argv.slice(1));
  } catch (err: any) {
    console.error(`apex ${cmd}: ${err?.message ?? err}`);
    if (process.env.APEX_DEBUG) console.error(err?.stack);
    return 1;
  }
}

main(process.argv.slice(2)).then((code) => process.exit(code));
