---
name: apex-prove
description: Compare two AIV scans to verify a fix moved the needle.
args:
  - name: before
    description: Optional reportId for the "before" scan. Defaults to second-most-recent.
    required: false
  - name: after
    description: Optional reportId for the "after" scan. Defaults to most recent.
    required: false
---

Verify a shipped fix actually improved AI visibility.

## Run

```bash
apex prove --json
```

Or with explicit IDs:

```bash
apex prove --before <ID> --after <ID> --json
```

## Read the output

The JSON `delta` includes:
- `visibilityScore.delta` — points change (out of 10)
- `newlyCitedEngines[]` — engines that started citing after
- `lostCitedEngines[]` — engines that *stopped* citing (regression!)
- `newlyMentionedQueries[]`
- `newCompetitorsCiting[]`
- `proven` (boolean) — true if visibility went up AND no engines were lost
- `confidence` — high / medium / low

## Summarize for the user

1. **Verdict** in one line: "PROVEN (+0.6 visibility, high confidence)" or "NOT PROVEN — regression in <engines>".
2. **What changed:** new citations, new query mentions, new competitors.
3. **What to do next:**
   - If proven → suggest `/apex-defend` to lock in monitoring.
   - If not proven and a regression appeared → name the engines/queries that lost ground and recommend reverting or investigating.
   - If proven=false but no regression → it just hasn't been long enough; remind the user citation signals lag readiness fixes by days.

## Important

- "Prove" requires at least 2 AIV scans. If there's only 1, tell the user to run `/apex-audit` and try again later.
- Never claim a fix is "proven" if `proven === false`.
