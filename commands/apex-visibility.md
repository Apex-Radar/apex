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
- **`aeoCeiling` field on the JSON output (v0.1.5+).** Present when at least one AEO check is `skipped` (i.e., the run was free-mode without inline citation grading). Its value is the maximum AEO score achievable on portable checks alone. When this field is set, the rendered score line shows `AEO X/Y portable` where Y is the ceiling. When absent, AEO is graded against the standard /100 scale.

## Summarize for the user

Give them three things in this order:

1. **Headline:** AAIV score and label (e.g. "AAIV 79/100 — Needs work"). When `aeoCeiling` is present in the JSON, the headline must spell out the cap explicitly so the user understands the AEO number isn't on a /100 scale. Use this shape: "AEO X/Y portable — capped at Y/100 in free mode because the 13 live AI citation checks (ChatGPT/Claude/Perplexity probes) can't run without BYOK or a Radar token." Never write just "AEO X/Y" without the why — the reader needs the scale and the reason in one beat. When `aeoCeiling` is absent, render plain "AEO X/100".
2. **What to do this week:** the top 3 fixable failing checks. Get these by pulling the JSON form (`apex visibility --json`) and reading `audit.checks[]` filtered by `status === "fail" && fixable === true`, sorted by impact (`high > medium > low`). For each, name a concrete fix path:
   - Missing/weak schema → suggest `/apex-fix faq-schema` or `/apex-fix organization-schema`
   - Crawler access issues → `/apex-fix ai-crawler-access`
   - Other → describe the fix in one sentence
3. **Citation status:** if `aaiv.citation.state === "pending"`, say plainly "Citation grading kicks in in N days (domain age N days)." If graded, give the citation score and whether it's tracking ahead of or behind the readiness score. **If `aeoCeiling` was present in the JSON**, end with the unlock path verbatim: "To grade those 25 points, run `apex keys set openai|anthropic|perplexity` (BYOK, free) or set a Radar token via `apex connect`." Adjust the number (25) to match `100 - aeoCeiling` so the math always reconciles.

## Important

- Never invent delta percentages. If you cite expected movement, use ranges from `delta-table.json` (high fail→pass = +6 to +8 readiness, etc.).
- "+2–3% AEO" labels are display estimates from Radar UI, not standardized — don't promise them.
