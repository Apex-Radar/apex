---
name: apex-visibility
description: Show AAIV + AEO posture from the latest Radar scan.
---

Show the user where they stand.

## Run

```bash
apex visibility
```

## Read the output

The CLI renders:

- **Overall** score, **SEO**, **AEO**
- **AAIV** (Apex AI Visibility) with two sub-scores:
  - "Are you understood?" — readiness (graded immediately)
  - "Are you cited?" — citation (graded only after the domain meets promotion criteria; otherwise shows pending + days remaining)

## Summarize for the user

Give them three things in this order:

1. **Headline:** AAIV score and label (e.g. "AAIV 79/100 — Needs work").
2. **What to do this week:** the top 3 fixable failing checks. Get these by pulling the JSON form (`apex visibility --json`) and reading `audit.checks[]` filtered by `status === "fail" && fixable === true`, sorted by impact (`high > medium > low`). For each, name a concrete fix path:
   - Missing/weak schema → suggest `/apex-fix faq-schema` or `/apex-fix organization-schema`
   - Crawler access issues → `/apex-fix ai-crawler-access`
   - Other → describe the fix in one sentence
3. **Citation status:** if `aaiv.citation.state === "pending"`, say plainly "Citation grading kicks in in N days (domain age N days)." If graded, give the citation score and whether it's tracking ahead of or behind the readiness score.

## Important

- Never invent delta percentages. If you cite expected movement, use ranges from `delta-table.json` (high fail→pass = +6 to +8 readiness, etc.).
- "+2–3% AEO" labels are display estimates from Radar UI, not standardized — don't promise them.
