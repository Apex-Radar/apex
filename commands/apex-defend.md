---
name: apex-defend
description: Defensive monitoring — detect regressions across recent AIV scans.
---

Defend mode looks across recent scans to catch silent regressions.

## Run

```bash
apex prove --json
apex trends --json
apex visibility --json
```

(Three reads — no scans triggered.)

## Analyze

Combine the outputs:

1. **Engine regressions:** any engine in `prove.lostCitedEngines`?
2. **Score regression:** is the most recent point in `trends` ≥ 0.5 points below the previous filled marker?
3. **Failing high-impact checks:** from `visibility.audit.checks`, count `status === "fail" && impact === "high"`. If this number went up vs the previous scan (compare `aiv.previousScore` indirectly by re-running `apex visibility --json` against the prior scan if available), flag.
4. **Competitor encroachment:** new names in `prove.newCompetitorsCiting`.

## Output

Give the user a short defense report:

- ✅ / ⚠️ / 🚨 status per category
- For each issue: one-line description + one-line recommended action
- If everything is green, say so plainly.

## Important

- Defend mode is read-only. Never auto-trigger fixes.
- If the user has only 1 scan, say "Need at least 2 scans to defend. Run `/apex-audit` and check back tomorrow."
