---
name: apex-costs
description: Inspect local BYOK cost ledger (~/.apex/ledger.jsonl).
args:
  - name: tail
    description: Number of recent entries to show (default 20).
    required: false
---

## Run

```bash
apex costs --json --tail <N>
```

(Default `--tail 20` if no value.)

## Read the output

`summary` has total USD, byProvider, byOperation. `recent` has the last N entries.

## Summarize for the user

1. **Total spend** to date (this is *estimated* — based on published per-token rates, not provider invoices).
2. **Top provider** and **top operation** by spend.
3. If recent activity has spiked vs prior history, note it.

## Important

- The ledger is local-only — Apex never sends usage data anywhere.
- Numbers are estimates. The user's actual provider invoice is the source of truth.
- If the ledger is empty, tell the user it'll start populating after their first `/apex-citation` or other BYOK operation.
