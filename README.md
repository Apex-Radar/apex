# Apex

**A Claude skill for Answer Engine Optimization (AEO).**
Diagnose how well your site can be understood and cited by ChatGPT, Claude, Perplexity, and Gemini — right inside Claude Code or Claude Desktop, conversationally.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-21%2F21-brightgreen.svg)](#)
[![Parity](https://img.shields.io/badge/parity-100%25-brightgreen.svg)](#parity-with-the-hosted-free-audit)

---

## What Apex does

Apex turns Claude into your AEO analyst. Drop the skill in, then ask:

> /apex visibility https://yoursite.com

And Claude will:

1. Crawl the page
2. Run **77 portable AEO + SEO checks** (schema breadth, AI crawler access, citation hooks, entity strength, content depth, semantic structure, llms.txt, freshness — same check logic as the hosted free audit)
3. Score you out of 100 across SEO and AEO
4. Tell you exactly what to fix first, in plain English

Everything runs locally on your machine. No account. No backend. No data leaves.

---

## Install in 60 seconds

### Option A — Claude Code (one-line plugin install, recommended)

Inside Claude Code:

```
/plugin marketplace add Apex-Radar/apex
/plugin install apex@apex-marketplace
```

That's it. The slash commands appear immediately — no clone, no build, no restart.

### Option B — Claude Code (manual clone, for hacking on it)

```bash
git clone https://github.com/Apex-Radar/apex.git ~/.claude/skills/apex
cd ~/.claude/skills/apex
npm install
npm run build
```

Restart Claude Code. The slash commands appear automatically:

- `/apex` — entry point, status + subcommand list
- `/apex-visibility` — full AEO + SEO scorecard (AAIV + AEO posture)
- `/apex-gaps` — what to fix first, ranked by impact
- `/apex-fix <fixer-id>` — apply a fixer (`ai-crawler-access`, `faq-schema`, `organization-schema`). Dry-run by default; confirms before writing.
- `/apex-prove` — re-run after a fix to confirm score change
- `/apex-citation` — BYOK ad-hoc citation probe (ChatGPT / Perplexity / etc.)
- `/apex-audit` — kick off a fresh Radar AEO scan
- `/apex-trends` — show AI visibility trend over time
- `/apex-defend` — detect regressions across recent scans
- `/apex-connect` — set up Radar portal token + BYOK provider keys
- `/apex-keys` — manage BYOK API keys
- `/apex-costs` — inspect local BYOK cost ledger

### Option C — Claude Desktop

```bash
git clone https://github.com/Apex-Radar/apex.git \
  ~/Library/Application\ Support/Claude/skills/apex
cd ~/Library/Application\ Support/Claude/skills/apex
npm install
npm run build
```

Restart Claude Desktop. Same commands as above.

### Option D — standalone CLI (no Claude required)

```bash
npm install -g @apexradar/apex
apex visibility --url https://yoursite.com
```

---

## How it works

Apex ships **two audit modes**:

| Mode | What it does | Requires |
|------|-------------|----------|
| **Local (default)** | Fetches the URL, parses the HTML in-process, runs the full check suite locally | Nothing — works offline against any public URL |
| **Radar (optional)** | Pulls a richer 110-check audit and live citation probes from [Apex Radar](https://getapexradar.com) | A free Radar workspace token |

You never need a Radar account to use the skill. The Radar mode exists for users who already have a workspace and want richer data; the local mode is the canonical free experience.

To use Radar mode:

```bash
apex keys set radar_portal <your-32-char-token>
# then
/apex visibility   # uses your Radar workspace automatically
```

---

## The vocabulary

Apex teaches Claude to talk about AEO the way it actually works:

- **Are you understood?** — Can LLMs identify your brand, what you do, who you serve?
- **Are you cited?** — When someone asks an LLM a question you should answer, do you appear?
- **Move this number first.** — Apex always tells you the single highest-impact fix.
- **AEO compounds after.** — Schema + crawler access + entity strength compound over weeks.

---

## What's checked

**77 portable checks** running against your raw HTML — same check logic as Apex Radar's hosted free audit. v0.1.0 ships with parity-faithful per-check status agreement (see [Parity with the hosted free audit](#parity-with-the-hosted-free-audit)).

**SEO foundations (45 checks):**
title length, meta description length, H1 count, heading hierarchy, word count, content-to-HTML ratio, canonical tag, HTTPS, robots meta, Open Graph tags, HTML language, hreflang, image alt text, lazy loading, dimensions, internal/external/empty links, anchor text quality, nofollow links, URL length & characters, page size, inline CSS, render-blocking scripts, deprecated HTML, iframes, text compression, structured data presence, social media links, exposed emails, duplicate meta tags, content freshness, robots.txt (presence + blocking + syntax), XML sitemap, sitemap-in-robots.txt.

**AEO signals (32 checks):**
12 schema types (Organization, LocalBusiness, FAQPage, FAQ schema visibility, HowTo, Article, BreadcrumbList, Review, Service/Product, ContactPoint, SameAs, Author/Person), schema completeness + validity, 6 AI-crawler bots access (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider), llms.txt presence + validity, question headings, direct answer format + blocks, list content, table content, paragraph length, content depth, entity mentions, citation-ready paragraphs, FAQ content, authority signals, clear CTAs, location signals, topical focus, content originality, semantic HTML, external authority links.

Each check returns `pass | warn | fail` plus an impact score so the gaps command can rank fixes by ROI.

## Parity with the hosted free audit

Apex CLI's local mode and the hosted free audit at `apexarchitects.com/audit` use the **same check logic**. As of v0.1.0, the per-check status agreement is **100%** on real-world domains (verified across `apexarchitects.xyz`, `getapexradar.com`, `example.com`).

| Mode | Check count | What runs |
|------|-------------|-----------|
| **CLI local** (this tool, free) | 77 | Pure Cheerio / HTML parse; runs on your machine, no auth |
| **Hosted free audit** | ~107 | The 77 above + ~30 backend-derived checks |
| **Apex Radar (paid tier)** | ~110 | The 107 above + live AI citation probes (ChatGPT, Claude, Perplexity) and continuous tracking |

The 30 backend checks the CLI can't run locally: 11 Lighthouse-derived performance metrics (LCP, TBT, CLS, FCP, Speed Index, TTI, etc.), DNS Response Time, SSL Certificate, Google Indexation, AI citation API checks (ChatGPT/Claude/Perplexity Citation, Sentiment, Brand Accuracy, etc.), and Raw HTML Adequacy (which compares JS-rendered vs raw HTML — needs a separate fetch). All require external services or pre-rendered comparisons that don't fit the "local + offline" promise.

**Aggregate score numbers** (the headline `SEO 80 / AEO 70 / Overall 75`) will differ slightly between CLI and free audit because the denominators differ (77 vs ~107). The per-check status is what's identical. AAIV / readiness scores typically agree within ±1 point.

---

## BYOK (Bring Your Own Keys)

Apex never proxies LLM calls. If a check or fixer needs an LLM, it uses *your* API key from your local env or keychain. We never charge you, never see your traffic, never see your data.

Supported providers: Anthropic, OpenAI, Perplexity, Google.

Set keys with:

```bash
apex keys set anthropic <your-key>
apex keys set openai <your-key>
```

Keys are stored in macOS Keychain when available, falling back to a local env file otherwise.

---

## Architecture

```
~/.claude/skills/apex/
├── SKILL.md              ← teaches Claude what Apex is and how to use it
├── commands/             ← slash command specs (one .md per command)
├── src/
│   ├── local-audit/      ← runs without any backend
│   ├── radar/            ← optional enrichment client
│   ├── fixers/           ← idempotent, safe code patches
│   └── core/             ← rendering, key management, shared utilities
└── dist/                 ← compiled output
```

---

## License

MIT. Use it, fork it, ship it inside your own product.

## Credits

Apex stands on the shoulders of:

- **[aeo.js](https://github.com/aeoschool/aeo.js)** — pioneering open-source AEO checks
- **[goose-aeo](https://github.com/block/goose-aeo)** — Block's AEO methodology
- **[aeo-strategist-claude-skill](https://github.com/indranilbanerjee/aeo-strategist-claude-skill)** — Indranil Banerjee's enterprise AEO skill

See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for upstream license texts.

## Built by

The team behind [Apex Radar](https://getapexradar.com) — continuous AEO monitoring for brands that want their AAIV and citation scores tracked over time.

If the skill is useful, the hosted product is the natural next step. But the skill stands on its own. Forever free.
