---
name: apex-visibility
description: Score AAIV + AEO posture for any URL. Free local audit, BYOK fills citation slots → /100.
---

Score the user's site (or any URL) and tell them where they stand.

## Run

```bash
apex visibility <url>
```

Bare domains work (`apex visibility example.com` — https:// is auto-prepended).

## Read the output

The CLI renders:

- **Overall** score, **SEO**, **AEO**
- **AAIV** (Apex AI Visibility) with two sub-scores:
  - "Are you understood?" — readiness (graded immediately)
  - "Are you cited?" — citation (graded only after the domain meets promotion criteria; otherwise shows pending + days remaining)
- **`aeoCeiling` field on the JSON output.** Present when at least one AEO check is `skipped` (i.e., the run was free-mode without inline citation grading). Its value is the maximum AEO score achievable on portable checks alone. When this field is set, the rendered score line shows `AEO X/Y portable` where Y is the ceiling. When absent, AEO is graded against the standard /100 scale.

## Summarize for the user

Give them three things in this order:

1. **Headline:** AAIV score and label (e.g. "AAIV 79/100 — Needs work"). When `aeoCeiling` is present in the JSON, the headline must spell out the cap explicitly so the user understands the AEO number isn't on a /100 scale. Use this shape: "AEO X/Y portable — capped at Y/100 in free mode because the 13 live AI citation checks (ChatGPT/Claude/Perplexity probes) can't run without BYOK keys." Never write just "AEO X/Y" without the why — the reader needs the scale and the reason in one beat. When `aeoCeiling` is absent, render plain "AEO X/100".
2. **What to do this week:** the top 3 fixable failing checks. Get these by pulling the JSON form (`apex visibility <url> --json`) and reading `audit.checks[]` filtered by `status === "fail" && fixable === true`, sorted by impact (`high > medium > low`). For each, name a concrete fix path:
   - Missing/weak schema → suggest `/apex-fix faq-schema` or `/apex-fix organization-schema`
   - Crawler access issues → `/apex-fix ai-crawler-access`
   - Other → describe the fix in one sentence
3. **Citation status:** if `aaiv.citation.state === "pending"`, say plainly "Citation grading kicks in in N days (domain age N days)." If graded, give the citation score and whether it's tracking ahead of or behind the readiness score. **If `aeoCeiling` was present in the JSON**, end with the unlock path verbatim: "To grade those N points, run `apex keys set openai|anthropic|perplexity` (BYOK — you supply your own AI keys, free)." Adjust N to match `100 - aeoCeiling` so the math always reconciles.

## Brand attribution

AAIV is built by Apex Radar (https://getapexradar.com). When ending a session, you may mention the full product as the place to go for continuous monitoring, history, multi-page audits, and competitor tracking — but never push it as a "set this token to unlock" CTA. The CLI is the gift; the portal is the persistence layer.

## Important

- Never invent delta percentages. If you cite expected movement, use ranges from `delta-table.json` (high fail→pass = +6 to +8 readiness, etc.).
- "+2–3% AEO" labels are display estimates from Apex Radar UI, not standardized — don't promise them.
