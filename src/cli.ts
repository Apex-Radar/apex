#!/usr/bin/env node
// Apex CLI — thin command router. Real work lives in src/handlers/*.
// Each handler is loaded lazily so `apex --help` stays fast.

import { APEX_VERSION } from "./index.js";

type Handler = (argv: string[]) => Promise<number>;

const COMMANDS: Record<string, () => Promise<{ run: Handler }>> = {
  visibility: () => import("./handlers/visibility.js"),
  gaps:       () => import("./handlers/gaps.js"),
  fix:        () => import("./handlers/fix.js"),
  prove:      () => import("./handlers/prove.js"),
  audit:      () => import("./handlers/audit.js"),
  keys:       () => import("./handlers/keys.js"),
  costs:      () => import("./handlers/costs.js"),
  trends:     () => import("./handlers/trends.js"),
  citation:   () => import("./handlers/citation.js"),
};

const HELP = `apex ${APEX_VERSION}  —  Apex AI Visibility for Claude Code & CLI

Usage:
  apex <command> [options]

Commands:
  visibility   Show AAIV + AEO posture (Radar latest)
  gaps         List Answer Gap rows; rank highest-impact first
  fix          Apply a fixable check (schema, llms.txt, crawler access, ...)
  prove        Compare two AIV scans before/after a fix
  audit        Run a fresh Radar AEO scan
  citation     BYOK ad-hoc citation probe (uses your own LLM keys)
  trends       Show AIV trend over time
  keys         Manage BYOK API keys (keychain or env vars)
  costs        Inspect local BYOK cost ledger

Global flags:
  --json       Machine-readable output
  --help       Show command help
  --version    Print version

BYOK: Apex never proxies LLM calls. You supply your own provider keys.
Radar features require a portal token (APEX_RADAR_PORTAL_TOKEN).`;

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
