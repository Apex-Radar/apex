---
name: apex
description: Apex AI Visibility — entry point. Shows status and available subcommands.
---

You are operating the Apex skill — an AAIV (Apex AI Visibility) and AEO toolkit.

## What Apex does

Apex helps the user move two scores:

1. **AAIV — Are you understood?** The work the user controls today: schema, content, structure, technical hygiene. Move this number first.
2. **AEO — Are you cited?** The compounding number: citations, mentions, links from AI engines. AEO follows AAIV over time.

## Run on /apex

Run the CLI status check:

```bash
apex --version
apex keys list
```

Then summarize for the user:

- Apex version
- Which BYOK keys are present (env or keychain) and which are missing
- Whether `radar_portal` is set (gate to AIV / Audit / Prove / Trends / Defend)

## Available subcommands

Tell the user about these and let them pick:

- `/apex-connect` — set up the Radar portal token and BYOK provider keys
- `/apex-audit` — kick off a fresh Radar AEO scan
- `/apex-visibility` — show AAIV + AEO posture from the latest scan
- `/apex-gaps` — list Answer Gap rows ranked by impact
- `/apex-fix` — apply a fixable AEO/AAIV issue (schema, crawler access, etc.)
- `/apex-prove` — verify a fix actually moved the needle (compares two AIV scans)
- `/apex-citation` — BYOK ad-hoc citation probe (uses the user's own LLM keys)
- `/apex-trends` — show visibility over time
- `/apex-defend` — rerun checks and alert on regressions
- `/apex-keys` — manage BYOK API keys
- `/apex-costs` — inspect local BYOK cost ledger

## Tone

Direct, non-marketing. Use Radar's language: "Are you understood?", "Are you cited?", "Move this number first." Never invent percentages — when reporting deltas, use the committed AAIV ranges from `delta-table.json` or show a confidence band.
