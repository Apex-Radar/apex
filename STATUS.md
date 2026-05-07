# Apex — build status (resume here)

**Last updated:** 2026-05-07 evening (Phases 1+2+3 of parity port shipped in one session — 100% per-check status agreement achieved)
**Next session goal:** v0.1.0 publish — `git init` + push to `Apex-Radar/apex`, `npm publish @apexradar/apex`, tag v0.1.0, GitHub release.

> **PUBLISH-READY MILESTONE — 2026-05-07:** Mark's directive ("exactly the same or nearly identical") delivered. Parity rig shows **100% per-check status agreement** on apexarchitects.xyz (77/77) and getapexradar.com (77/77). AAIV scores match within ±1 point of free audit. Aggregate scores diverge by 7-14 points purely due to structural denominator difference (CLI 77 portable checks vs free audit 107 including 30 backend-only checks for Lighthouse / DNS / SSL / Google Indexation / AI citation probes that legitimately can't run locally). The 30-check Radar-only delta is documented and unblocking.

> **Phase progress (compressed from 5 planned sessions to 1):**
> - ✅ Phase 1: Parity rig + plan + baseline measurement
> - ✅ Phase 2: SEO port (45 checks across 6 files: content, foundations, images, links, structure, robots-sitemap)
> - ✅ Phase 3: AEO port (32 checks across 3 files: schema, bot-access+llms-txt, content+signals); replaced 4 obsolete CLI files
> - 🔵 Phase 4: Multi-URL parity verification (current: 2/4 default URLs at 100%; gooseworks.ai + example.com need re-test; TBD platform variants)
> - 🔵 Phase 5: README + skill.md updates with new check inventory + CHANGELOG v0.1.0 final

---

## Where we are

The Apex skill is **publish-ready code-wise**, **and the three publish-blockers from the brain review are now fixed.** Everything builds, all tests pass, slash commands work locally, and the project has been smoke-tested against the live Apex Radar API.

- Repo path: `/Users/markpernitsch/apex`
- Build: clean (ESM + DTS)
- Tests: 21/21 passing across 7 files (`npm test`) — was 24/8 pre-cleanup; lost 3 duplicate test runs after de-duping `test/` and `tests/`, real coverage unchanged
- CLI installed globally via `npm link` — `apex` works from anywhere
- Slash commands installed at `~/.claude/commands/apex/` (individual file symlinks)
- Backend bypass deployed by senior dev (commit `7c42ce9`) — `requireAuth` accepts 32-char hex token in URL path
- Radar portal token rotated and stored in `~/.zshrc` as `APEX_RADAR_PORTAL_TOKEN`

## Publish-blockers fixed 2026-05-07 morning (review pass)

1. **Dead code purged.** Deleted parallel/orphaned trees: `src/local/` (8 files, dupe of `src/local-audit/`), flat files `src/core/{cost,keys,framework,render,ledger}.ts` (replaced by subdirectory versions, had broken imports — confirmed via grep that nothing imported them), and the duplicate `test/` directory (`test/local-audit.spec.ts` was a 1-line-diff copy of `tests/local-audit.test.ts`). Total: 13 files removed. Tests + build pass post-purge.
2. **Command surface reconciled.** `skill.md` now lists the actual 11 hyphenated slash commands that ship in `commands/` (was wrong: documented 7 with space-separated form like `/apex visibility` and `fix:ai-crawler-access` that wouldn't have triggered any handler). README slash-commands section updated to match. The fixer pattern is now correctly documented as `/apex-fix <fixer-id>` (single command with arg) rather than three separate fix:* commands.
3. **GitHub repo + npm package status: still pending Mark.** `Apex-Radar/apex` repo not yet created; `@apexradar/apex` not yet published. Until that lands, README install instructions will fail. Either ship today, or add a "Coming soon" banner.

## What's done (batches 1–12)

- ✅ Batch 1–6: core skill, handlers, fixers, slash commands, adapters, GitHub Action, tests, CI
- ✅ Batch 7: contract drift fix (real Radar API field shapes)
- ✅ Batch 8: local audit engine (`src/local-audit/`) — no token required
- ✅ Batch 8.1: vitest test for local audit + corrected `vitest.config.ts`
- ✅ Batch 9: public README.md
- ✅ Batch 10: SKILL.md rewrite (two-mode model, Radar voice, hard rules)
- ✅ Batch 11 + 11.1: ATTRIBUTIONS.md (with Indranil MIT correction)
- ✅ Batch 12: CHANGELOG.md (v0.1.0 dated 2026-05-06)

## What's left

### Optional polish (Mark's call which to do)

- [ ] **Obsidian `--out` flag** — write scorecards as markdown into Mark's vault. He said early on he wanted Apex in Obsidian; we never built it. Smallest, highest immediate value.
- [ ] **More fixers** — `fix:llms-txt`, `fix:howto-schema`, `fix:meta-description`. Each is a small batch.
- [ ] **CLI `--help` polish** — make `apex` feel finished to a cold installer.
- [ ] **VS Code / Cursor extension wrapper** — bigger lift, real strategic value.

### Publishing (Mark only — Claude won't run these)

- [ ] `git init` and push to `Apex-Radar/apex` on GitHub
- [ ] `npm publish --access public` for `@apexradar/apex`
- [ ] Tag `v0.1.0` and cut a GitHub release
- [ ] Submit the GitHub Action to the marketplace
- [ ] Announce (tweet, post, show audience)

## How to resume tomorrow

Open a new chat with Claude in the browser. Paste this entire file as your first message, with this prefix:

> "Resuming the Apex build. Here's where I left off:" *(then paste this file)*

Then tell me which item from "What's left" you want to do first. I'll pick up exactly where we stopped.

## Key context I need to remember

- Name: Apex, slash command `/apex`, MIT, both distributions (Claude Code skill + Node CLI)
- BYOK enforced — Apex never proxies LLM calls
- Userback NOT in the public skill (it's only in the private Radar beta)
- Real Radar API uses `overallScore` (not `scoreOverall`), top-level `readiness`/`citation`, uppercase `SEO`/`AEO` categories, optional `impact` on AEO checks only
- Two audit modes: local (default) and Radar (BYOK token enrichment)
- Mark wants this in Obsidian eventually
- Front end is intentionally minimal — Claude Code chat IS the front end
- File delivery format: labeled FILE banners (`# ═══ FILE N of M ═══`) so files never blur into one another
