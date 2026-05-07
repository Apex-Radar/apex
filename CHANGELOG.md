# Changelog

All notable changes to Apex will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/Apex-Radar/apex/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Apex-Radar/apex/releases/tag/v0.1.0
