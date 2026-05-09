# Changelog

All notable changes to Apex will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] — 2026-05-09

### BREAKING

- **Removed 4 commands that required a Radar workspace token:** `apex audit`, `apex gaps`, `apex prove`, `apex trends`. Also removed `apex-connect` skill template. The Radar workspace token (`radar_portal` provider) was a leftover from an earlier funnel theory and has been retired from the CLI's surface entirely. The portal product (https://getapexradar.com) is the persistence layer; the CLI is the public-good audit.
- **`radar_portal` is no longer a valid `apex keys` provider.** `apex keys set radar_portal …` now errors. Existing keychain entries are orphaned and harmless; remove with your OS keychain UI if desired.
- **`--local` flag removed from `apex visibility`.** The CLI is now single-mode (always local Cheerio audit). The flag was vestigial without a Radar mode to opt out of.
- **Public library exports trimmed.** `RadarAuditClient`, `RadarAivClient`, and several AIV/answer-gap workflow types are no longer exported from `@apexradar/apex`. The `AuditResult` shape and supporting types are still exported.

### Changed

- **CLI surface focused on its real job: AAIV awareness.** Single mission — score any URL with the local Cheerio audit; BYOK keys (OpenAI / Anthropic / Perplexity / Gemini / Grok / DeepSeek / Firecrawl) for the citation slots. Apex Radar brand attribution is prominent in `--help`, scorecard footer, README, and SKILL.md, with a clean link to https://getapexradar.com for the full product (history, multi-page, monitoring, alerts).
- **Score-card footer reframed.** Drops the "set a Radar token" unlock pitch. Now: BYOK as the only unlock path for the citation slots, plus brand attribution and a non-pushy product link.
- **Citation stub messages no longer mention "or a Radar token."** Just BYOK.
- **`apex --help` rewritten** with a brand-prominent header crediting Apex Radar and explaining what AAIV is.

### Removed

- `src/handlers/audit.ts`, `gaps.ts`, `prove.ts`, `trends.ts`
- `src/radar/audit-client.ts`, `aiv-client.ts`
- `src/workflow/answer-gap.ts`, `prove.ts`
- `commands/apex-audit.md`, `apex-gaps.md`, `apex-prove.md`, `apex-trends.md`, `apex-connect.md`, `apex-defend.md`
- `requireToken()` helper from `_shared.ts` and `_flags.ts`
- `RADAR_BASE` constant, `getRadarPortalToken()` function
- `tests/answer-gap.test.ts`, `tests/prove.test.ts`

## [0.1.6] — 2026-05-08

### Fixed

- **`apex visibility <url>` now scans the URL you typed, regardless of Radar token.** Before this release, a configured Radar token silently overrode any URL passed and dumped the workspace's last cached scan instead. Now: if you pass a URL (positional or `--url`), Apex always runs a local audit on that URL — so you can scan competitors, prospects, or any site without having to clear your token. When a Radar token IS set and we go local because of a passed URL, we add a one-line note so you know your token isn't ignored, just bypassed for this scan.
- **`apex visibility --local <url>` works as the natural reading.** The flag parser was greedily consuming the URL as the `--local` flag's value. Boolean flags (`--local`, `--dry-run`, `--force`, `--verbose`, `--quiet`) now never consume the next arg.
- **Friendlier error when a URL is missing.** Lists three valid invocations and explains what running `apex visibility` with no URL does when a Radar token IS configured (fetches workspace latest).

### Changed

- **AEO score line drops the `/Y portable` framing in favor of `/100` baseline with cap-in-parens.** The previous `AEO 60/75 portable` framing accidentally oversold for uncited sites — a user reading "60/75" perceived 80% completeness while their real /100 was 60%. The new `AEO 60/100 (cap 75, citation gated)` puts the /100 reality first and shows the cap as a constraint, not a parallel scale. Free-mode and Radar-mode scores now compare apples-to-apples.
- **Free-mode footer reframed to lead with BYOK** (the path that actually works for new users) and demote Radar to a sign-up tease. Old text told users to "set a Radar token via `apex connect`" — but there's no self-serve way to generate a token without a workspace. New text: "To grade those, run `apex keys set openai|anthropic|perplexity` (use your own AI key, free). For continuous monitoring across all 113 checks, sign up at https://getapexradar.com."
- **`/apex-connect` skill walkthrough** now has an explicit "no account → skip this step" branch instead of asking new users to go find a token that doesn't exist for them yet.
- **Skill summary template** (`commands/apex-visibility.md`) updated so wrapper agents reading the new guidance always surface the cap, the reason, and the unlock path when summarizing capped-mode results. Closes the gap where chat clients dropped the explanation when paraphrasing.

## [0.1.5] — 2026-05-08

### Fixed

- **Free-mode AEO score is now mathematically honest.** Previously, `apex visibility` in free mode silently dropped the 13 citation checks (ChatGPT/Claude/Perplexity probes, multi-provider coverage, brand accuracy, etc.) from the AEO denominator, which inflated the displayed score. On a real test site this produced AEO 79 against a true ceiling of 75, which is mathematically impossible. Now the 13 citation checks are emitted with a new `"skipped"` status and counted in the denominator. The free-mode AEO score caps at the ceiling derived from the actual portable-check inventory and renders as `AEO 60/75 portable` instead of `AEO 79`. Users see the real score, the visible ceiling, and an explicit unlock path.
- **Closing footer in free mode now explains why the score is capped.** Three lines below the scorecard: what the score covers ("what we can check from your site's HTML"), what's missing ("live AI citation checks: whether ChatGPT, Claude, and Perplexity actually mention you"), and the unlock path (`apex keys set openai|anthropic|perplexity` or `apex connect` for a Radar token). Plain language, no jargon.

### Added

- **`"skipped"` status on `AuditCheck`.** New status alongside `pass`/`warn`/`fail`. Skipped checks stay in the denominator (so they pull the score down honestly) but are not counted as passes. Renders with a 🔒 glyph in the counts summary line.
- **`aeoCeiling` field on `AuditResult`.** Optional number, present when at least one AEO check is `skipped`. Renderer reads this field to switch between `AEO X/Y portable` and `AEO X/100`. Data-driven, never inferred.

### Notes for BYOK users

- BYOK keys (OpenAI/Anthropic/Perplexity) still work the same way: run `apex citation "<query>"` to spot-grade a citation. Inline citation grading inside `apex visibility` is on the v0.1.6 roadmap. Until then, BYOK and free CLI render the same capped output. Configuring a key alone doesn't change the score; only graded probe results do.

## [0.1.4] — 2026-05-07

### Added

- **One-line plugin install for Claude Code.** `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json` ship at the repo root. Users can now install Apex with two commands inside Claude Code: `/plugin marketplace add Apex-Radar/apex` then `/plugin install apex@apex-marketplace`. No clone, no `npm install`, no manual file moves. README updated with this as the recommended Option A.
- **Positional URL support on `apex visibility` and `apex audit`.** Type `apex visibility example.com` instead of `apex visibility --url https://example.com`. The `--url` flag still works for scripts.
- **Bare-domain auto-prefix.** If you type a URL without a protocol (`apex visibility example.com`), Apex auto-prepends `https://` instead of erroring.

### Fixed

- **`SKILL.md` filename casing.** Renamed `skill.md` → `SKILL.md` to match Claude Code's native skill auto-discovery convention. Manual filesystem installs (`git clone … ~/.claude/skills/apex`) now load the skill on first launch instead of silently failing on case-sensitive filesystems.

## [0.1.3] — 2026-05-07

### Changed

- **AAIV is now front-and-center on the score line.** `apex visibility` top line now reads `Overall X/100 · SEO Y · AEO Z · AAIV W/100` — AAIV pulled up beside AEO instead of being buried in the third detail line. The "AAIV — Apex AI Visibility" detail block (`Are you understood? / Are you cited?`) is preserved underneath as the breakdown. AAIV is the brand metric; it deserves the headline.
- **Skill summary template** rewritten so `/apex-visibility` chat summaries always lead with all three numbers — `**SEO X · AEO Y · AAIV Z** — The fastest move…` — instead of just AAIV. Closes a UX gap where users in chat clients with collapsed tool-output blocks couldn't see the SEO/AEO scores at all (they're in the rendered scorecard, but the prose summary skipped them).

### Fixed

- **`apex --version` now prints the real version.** Previously hardcoded as `"0.1.0"` in `src/index.ts` and never bumped — it was silently stale through 0.1.1 and 0.1.2 even though both releases shipped. Version is now read from `package.json` at build time via `tsup`'s `define` option, eliminating the recurrence class.

## [0.1.2] — 2026-05-07

### Fixed

- **`apex gaps` no longer leaks raw HTTP errors.** When the Answer Gap module isn't enabled on a Radar workspace, the command now returns a human-readable message ("Answer Gap data isn't available on this Radar workspace") with free alternatives and an upgrade link, instead of the developer-grade `AIV GET /answer-gap 404`. Also handles the case where the Radar proxy serves marketing-site HTML on missing routes (DOCTYPE / JSON-parse failures treated as the same condition).
- **`apex visibility` Radar-mode footer** no longer blindly points users at `apex gaps`. The closing line now explicitly calls out that ranked Answer Gap rows require the Radar Answer Gap **add-on module** (separate from the AIV scan) and points users at `apex fix --dry-run` as the universally-available next step.
- **`apex visibility` local-mode footer** now surfaces `apex citation "<query>"` (BYOK, free) as the path to grade "Are you cited?" alongside the existing Radar Portal upsell. Local mode never had a free citation-grading path before; this makes it discoverable.

### Changed

- **Capability tiers in `skill.md`.** The slash-command table now carries a tier column — 🟢 free local · 🔑 BYOK · 🟣 Radar Portal · 🟣⊕ Radar Portal add-on — and a NON-NEGOTIABLE rule that Claude must check tier vs configured capabilities BEFORE offering a command as a next step. Stops the skill from confidently offering Radar-only commands to free OSS users (the bug this release fixes).
- **"What should I fix?" guidance rewritten** to derive the fix list from the `apex visibility` scorecard (which is universally available) rather than calling `/apex-gaps` (which requires the add-on).
- **`commands/apex-gaps.md`** flags the 🟣⊕ add-on tier explicitly and adds a "don't retry within session after a not-enabled signal" rule.

## [0.1.1] — 2026-05-07

### Added

- **Comprehensive scorecard output.** `apex visibility` now shows ALL failing checks AND all warnings (not just the top 5 fails), grouped by category (AEO before SEO), ranked by impact, with each check's title + message + impact rendered. Counts summary line ("77 checks · ✓ 60 pass · ⚠ 16 warn · ✗ 1 fail") added under the score block. Free CLI is now a complete diagnosis tool, not just a score.
- **Radar upsell footer in local mode** — output ends with a one-line note about setting `APEX_RADAR_PORTAL_TOKEN` for continuous monitoring + AI citation probes. Free tier = full diagnosis, paid tier = the extra extra.
- **`--json` hint in default output** — power users immediately discoverable.

### Fixed

- `package.json` `bin[apex]` script path was `"./dist/cli.js"` (npm corrected it during publish but emitted a warning). Now `"dist/cli.js"` — matches npm's expected format.

## [0.1.0] — 2026-05-07

### Added

- **Local audit engine** (`src/local-audit/`) — runs entirely on the user's machine, no backend or token required. Fetches a URL, parses HTML in-process, and runs **77 portable SEO + AEO checks** matching the hosted free audit's check logic exactly. **100% per-check status agreement** verified against the hosted pipeline on apexarchitects.xyz, getapexradar.com, and example.com.
- **AAIV computation** in local mode — `buildAaivOutput` ported from the production pipeline. AAIV / readiness scores agree within ±1 point of the hosted free audit on real-world domains.
- **Parity rig** at `tools/parity.ts` — runs both engines on a list of URLs and reports per-check status agreement, score deltas, and remaining port backlog. CI-friendly via `npx tsx tools/parity.ts`.
- **Radar mode** — optional enrichment via [Apex Radar](https://getapexradar.com) workspace token, returning the full 110-check audit and live citation probes.
- **Slash commands** for Claude Code and Claude Desktop:
  - `/apex visibility [url]` — full SEO + AEO scorecard
  - `/apex gaps` — top 5 highest-impact fixes, ranked
  - `/apex prove [url]` — re-run after a fix and report score delta
  - `/apex fix:ai-crawler-access` — patch robots.txt to allow GPTBot, ClaudeBot, PerplexityBot, etc.
  - `/apex fix:faq-schema` — generate FAQPage JSON-LD from page Q&As
  - `/apex fix:organization-schema` — generate Organization JSON-LD with sameAs
  - `/apex keys` — manage BYOK API keys
- **Standalone CLI** (`@apexradar/apex` on npm) — same engine, usable without Claude Code or Claude Desktop.
- **GitHub Action** (`action/index.ts`) — run Apex on every PR and post the scorecard as a job summary.
- **BYOK key management** — Anthropic, OpenAI, Perplexity, Google, and Radar tokens stored in macOS Keychain (with env-var fallback) via `keytar`.
- **Idempotent fixer contract** (`src/fixers/_contract.ts`) — every fixer is dry-run first, diff-previewed, and safe to run twice.
- **Score card renderer** — terminal ANSI output and JSON output via `--json`.
- **21-test suite** across local audit, fixers, score rendering, and visibility handler. (Was 24 pre-cleanup; lost 3 duplicate test runs after de-duping `test/` and `tests/` directories — real coverage unchanged.)

### Notes

- This is the first public release. The skill works against any public URL out of the box; Radar mode is opt-in.
- Apex is MIT-licensed. Forks and derivative skills are encouraged.
- See `ATTRIBUTIONS.md` for credit to upstream OSS that informed Apex's design.

[Unreleased]: https://github.com/Apex-Radar/apex/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/Apex-Radar/apex/releases/tag/v0.1.1
[0.1.0]: https://github.com/Apex-Radar/apex/releases/tag/v0.1.0
