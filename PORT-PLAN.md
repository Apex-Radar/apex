# Apex CLI — v0.1.0 Parity Port Plan

> **Goal:** the CLI's local mode produces nearly identical per-check status as the apex-worker-do "free audit" pipeline on the same single page. Same engine = same answer.
> **Mark's directive (2026-05-07):** "I want them exactly the same. If it takes two days, it takes two days."

## Phase 1 done (2026-05-07)

- [x] Inventoried apex-worker-do's check set: **117 total** (60 SEO + 57 AEO).
  - Cheerio-portable: **92 checks** (79%)
  - Backend-only (Lighthouse / DNS / SSL / Google API / LLM citation probes): **25 checks** (21%) — these legitimately stay Radar-only.
- [x] Confirmed score formula in `apex-worker-do/src/auditor.js`:
  - `seoScore = round((seo_pass_count / total_seo_checks) * 100)`
  - `aeoScore = round((aeo_pass_count / total_aeo_checks) * 100)`
  - `overallScore = round((seoScore + aeoScore) / 2)`
- [x] Found a public endpoint to compare against: **`https://worker.apexarchitects.xyz/api/audit-test?url=...`** — returns the full single-page audit JSON synchronously, no auth.
- [x] Built parity rig at `tools/parity.ts`. Run with `tsx tools/parity.ts [URL...]`.
- [x] First baseline measurement (apexarchitects.xyz, 2026-05-07):
  - Free: SEO 75 / AEO 69 / AAIV 91 (107 checks)
  - CLI:  SEO 100 / AEO 83 / AAIV 75 (20 checks)
  - Per-check status agreement: **7/9 (78%)** — only 9 checks overlap by normalized name
  - Port backlog: **98 checks**
  - 2 disagreements: Organization Schema (free=pass, cli=warn), External Authority Links (free=fail, cli=pass)
  - 11 "CLI-only" checks — likely name-mapping mismatches, not real extras

## The core insight from Phase 1

**Aggregate scores will diverge structurally** even with perfect per-check parity, because:
- CLI denominator: ~92 portable checks
- Free audit denominator: ~117 total checks (the extra 25 mostly pass on healthy sites)

So the **real KPI is per-check status agreement**, not aggregate score equality. If the CLI ports check X and gets the same `pass/warn/fail` as the free audit on every URL, it's correct — even if the aggregate score differs by a few points because of the denominator.

The parity rig measures both. The metric to drive to ≥95% before publish is **per-check status agreement**.

## Name-mapping concern surfaced in Phase 1

Only 9 checks overlap by normalized name out of CLI's 20 — meaning **11 of CLI's checks have names that don't match the free audit's names** (e.g. CLI: `page-title` / free: `Title Tag`). Phase 2 must include a **name-translation table** so equivalent checks are matched correctly. Otherwise we'll keep underestimating overlap.

Suggested approach: each CLI check declares a `parityName` field that matches the free audit's exact `name`. Parity rig matches on `parityName` first, falls back to fuzzy normalize.

## Phase 2 — SEO port (next session)

Target: port ~45 portable SEO checks. Goal: SEO status agreement ≥ 95% on apexarchitects.xyz.

**Order of operations:**
1. Read `apex-worker-do/src/checks/seo-checks.js` end-to-end. Note shared utilities used.
2. Add `parityName` to existing CLI SEO checks. Re-run parity rig — the apparent overlap should jump significantly.
3. Add the missing portable SEO checks in priority order:
   - **Tier 1 (high-impact, most common signals):** Title Tag (length variants), Meta Description (length variants), H1 Count, Heading Hierarchy, Canonical Tag/Resolves, Open Graph Tags, Twitter Card, HTML Language, Hreflang, Word Count, Content-to-HTML Ratio.
   - **Tier 2 (link/image/structure):** Internal/External Links, Empty Links, Nofollow, Anchor Text Quality, Image Alt Text, Image Dimensions, Image Lazy Loading, URL Length/Characters, Page Size.
   - **Tier 3 (robots + sitemap):** Robots.txt suite (4 checks — port the parsing carefully, reuse the same library if any), Sitemap suite (3 checks: presence in robots, freshness, valid format). Sitemap URLs Live requires HEAD-fetching — port as a CLI capability.
   - **Tier 4 (HTML quality):** Render-Blocking Scripts, Deprecated HTML, iframes, Inline CSS, Duplicate Meta Tags, Structured Data Present, Social Media Links, Exposed Emails, Content Freshness, Text Compression (header check).
4. Run parity rig after each tier. Fix disagreements as they surface.
5. Document Lighthouse-only checks as known gaps in CLI's local mode (unsigned).

**Skipped / Radar-only:** Lighthouse-derived (Performance, Accessibility, Best Practices, SEO scores; LCP, TBT, CLS, FCP, Speed Index, TTI, TTFB), DNS Response Time, SSL Certificate, Google Indexation.

## Phase 3 — AEO port

Target: port ~44 portable AEO checks. Goal: AEO + AAIV status agreement ≥ 95%.

**Order of operations:**
1. Read `apex-worker-do/src/checks/aeo-checks.js` end-to-end. Pay attention to:
   - The 12 schema type checks — port each as a single function with shared validation logic.
   - The 6 bot-access checks (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider) — share the `isBotDisallowed` helper from aeo-checks.js.
   - The `FACTOR_META` table that drives the AAIV factor presentation. Port wholesale.
2. Add `parityName` to existing CLI AEO checks. Re-run parity rig.
3. Port in priority order:
   - **Tier 1 (schema breadth):** All 12 schema types (Organization, FAQ, Service, Author/Person, HowTo, Article, LocalBusiness, Review, Product, Breadcrumb, ContactPoint), Schema Completeness, Schema Validity.
   - **Tier 2 (bot access + llms.txt):** 6 bot-access checks, llms.txt Present + Valid.
   - **Tier 3 (content patterns):** Question Headings, Direct Answer Format/Blocks, List Content, Table Content, Paragraph Length, Content Depth, FAQ Content, Citation-Ready Paragraphs, Conversational Content.
   - **Tier 4 (signals):** Authority Signals, External Authority Links, SameAs Entity Links, Entity Mentions, CTAs Present, Location Signals, Topical Focus, Content Originality, Semantic HTML, Raw HTML Adequacy.
4. **Build the AAIV readiness output** — port `buildAaivOutput()` from aeo-checks.js. This is the function that produces the `readiness: { score, label, factors }` object. Critical for the local-mode AAIV display matching the free audit.
5. Run parity rig after each tier.

**Skipped / Radar-only:** All 13 AI Citation API checks (ChatGPT/Claude/Perplexity/Source/Multi-Provider/AI Query Coverage/Brand Name Accuracy/Service Description Accuracy/AI Sentiment/AI Readiness Score/ChatGPT Competitors/AI Citation Test Available/AI Readiness Estimate).

## Phase 4 — Parity verification

Run parity rig against the URL panel:
- `apexarchitects.xyz` (Apex's own site)
- `getapexradar.com` (Apex's product site)
- `gooseworks.ai` (peer)
- `tryprofound.com` (premium competitor)
- A WordPress site (TBD — Mark to suggest)
- A Next.js site (TBD)
- A bare static HTML site (TBD)
- `example.com` (sanity check)

Tune any URL-specific divergences. Goal: ≥95% per-check agreement on every URL.

## Phase 5 — Tests + docs + publish

- vitest tests for every new check module (`tests/checks/seo-*.test.ts`, `tests/checks/aeo-*.test.ts`)
- Update README "What's checked" section with full check inventory
- Update skill.md `data-shape` section if `AuditCheck` shape evolved during port
- Update CHANGELOG with v0.1.0 final
- Resolve [[BUGS]] BUG-2026-017 (local-mode AAIV labeling) as part of the AAIV output port

Then publish: `git init` → `Apex-Radar/apex` repo, `npm publish @apexradar/apex`, tag v0.1.0.

## Effort estimate (paired session-hours)

- Phase 1 (done): 2h
- Phase 2 (SEO port): 12-15h
- Phase 3 (AEO port): 10-12h
- Phase 4 (verify + tune): 3-5h
- Phase 5 (tests + docs + publish): 3-5h

**Total: 30-40h, calendar 1.5-2 days of focused agent-paired sessions.**

## Open questions parked for tomorrow

1. **Name translation table architecture** — inline `parityName` field in each check vs. centralized `tools/check-names.ts` translation module? Lean toward inline — keeps the canonical name with the check.
2. **Shared utilities** — should the CLI vendor a copy of `apex-worker-do/src/utils/fetchers.js` (TypeScript port), or build minimal alternatives? Lean toward port — guarantees behavioral identity.
3. **Test fixtures** — where do offline test fixtures live? Suggest `tests/fixtures/<domain>/index.html` so vitest can test against captured HTML without network.
4. **Lighthouse subset** — could a Cheerio-only heuristic version of Performance Score (without Lighthouse API) be useful as a "local approximation"? Probably not — better to be honest that it's Radar-only.
5. **Publish gating** — confirm: do NOT publish v0.1.0 until parity ≥ 95% on all default URLs? Mark's directive says yes.
