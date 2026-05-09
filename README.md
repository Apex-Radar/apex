# Apex

**A Claude skill (and standalone CLI) for AAIV — Apex AI Visibility.**
Score how well your site can be understood and cited by ChatGPT, Claude, Perplexity, and Gemini — right inside Claude Code, Claude Desktop, or any terminal.

Built by [Apex Radar](https://getapexradar.com).

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-21%2F21-brightgreen.svg)](#)

---

## What Apex does

Apex turns Claude (or your terminal) into your AEO analyst. Drop the skill in, then ask:

> /apex visibility https://yoursite.com

And Claude will:

1. Crawl the page
2. Run **77 portable AEO + SEO checks** (schema breadth, AI crawler access, citation hooks, entity strength, content depth, semantic structure, llms.txt, freshness)
3. Score you out of 100 across SEO, AEO, and AAIV (Apex AI Visibility — the composite metric Apex Radar developed for AI search readiness)
4. Tell you exactly what to fix first, in plain English

Everything runs locally on your machine. No account. No backend. No data leaves.

Bring your own LLM keys (`apex keys set openai|anthropic|perplexity`) to fill the live citation checks and unlock the full /100 score. The CLI never proxies your calls — keys go straight from your machine to the provider.

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
- `/apex-visibility <url>` — full AAIV + AEO + SEO scorecard for any URL
- `/apex-citation <query>` — BYOK ad-hoc citation probe (ChatGPT / Claude / Perplexity)
- `/apex-fix <fixer-id>` — apply a fixer (`ai-crawler-access`, `faq-schema`, `organization-schema`). Dry-run by default; confirms before writing.
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
apex visibility https://yoursite.com
```

---

## How it works

The CLI runs entirely locally. It fetches the URL, parses the HTML in-process with Cheerio, and runs the full check suite on your machine. No backend, no signup, no data leaves.

**Citation slots:** 13 of the AEO checks need to actually call the AI engines (ChatGPT / Claude / Perplexity) to grade — that can't happen from HTML alone. Without BYOK keys, those 13 emit as `skipped` and the AEO score is honestly capped at /75. With BYOK keys configured, `apex visibility <url>` automatically fans out probes in parallel to every provider you've set up, fills the matching citation slots with graded results, and renders the score against the /100 scale.

```bash
apex keys set openai <your-openai-key>
apex keys set anthropic <your-anthropic-key>
apex keys set perplexity <your-perplexity-key>

apex visibility yoursite.com
# → AEO grades against /100; cost shown in the footer; probes logged to ~/.apex/ledger.jsonl
```

Configure one provider → only its per-engine slots grade (others stay `skipped`, ceiling rises but not to /100). Configure all three → every citation slot grades, /100 unlocked. You can scope what the probes ask with `--query "<question>"` and override the auto-derived brand with `--brand "<name>"`.

You pay the providers directly. Apex Radar never sees your traffic, your keys, or your data. Probes use cheap models by default: `gpt-4o-mini`, `claude-3-5-haiku`, `perplexity sonar` — typical full 3-engine probe runs ~$0.01–0.05 per scan.

---

## The vocabulary

Apex Radar invented the following framing for AAIV. Use it to talk about AI search readiness clearly:

- **Are you understood?** — Can LLMs identify your brand, what you do, who you serve?
- **Are you cited?** — When someone asks an LLM a question you should answer, do you appear?
- **Move this number first.** — Apex always tells you the single highest-impact fix.
- **AEO compounds after.** — Schema + crawler access + entity strength compound over weeks.

---

## What's checked

**77 portable checks** running against your raw HTML. Same check logic as the hosted Apex Radar audit.

**SEO foundations (45 checks):**
title length, meta description length, H1 count, heading hierarchy, word count, content-to-HTML ratio, canonical tag, HTTPS, robots meta, Open Graph tags, HTML language, hreflang, image alt text, lazy loading, dimensions, internal/external/empty links, anchor text quality, nofollow links, URL length & characters, page size, inline CSS, render-blocking scripts, deprecated HTML, iframes, text compression, structured data presence, social media links, exposed emails, duplicate meta tags, content freshness, robots.txt (presence + blocking + syntax), XML sitemap, sitemap-in-robots.txt.

**AEO signals (32 checks):**
12 schema types (Organization, LocalBusiness, FAQPage, FAQ schema visibility, HowTo, Article, BreadcrumbList, Review, Service/Product, ContactPoint, SameAs, Author/Person), schema completeness + validity, 6 AI-crawler bots access (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider), llms.txt presence + validity, question headings, direct answer format + blocks, list content, table content, paragraph length, content depth, entity mentions, citation-ready paragraphs, FAQ content, authority signals, clear CTAs, location signals, topical focus, content originality, semantic HTML, external authority links.

Each check returns `pass | warn | fail` plus an impact score so the renderer can rank fixes by ROI.

---

## BYOK (Bring Your Own Keys)

Apex never proxies LLM calls. If a check needs an LLM, it uses *your* API key from your local env or keychain. We never charge you, never see your traffic, never see your data.

Supported providers: OpenAI, Anthropic, Perplexity, Gemini, Grok, DeepSeek, Firecrawl.

Set keys with:

```bash
apex keys set openai <your-key>
apex keys set anthropic <your-key>
```

Keys are stored in macOS Keychain when available, falling back to env vars otherwise.

---

## Architecture

```
~/.claude/skills/apex/
├── SKILL.md              ← teaches Claude what Apex is and how to use it
├── commands/             ← slash command specs (one .md per command)
├── src/
│   ├── local-audit/      ← runs without any backend
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

## Built by Apex Radar

AAIV (Apex AI Visibility) is the metric Apex Radar developed to measure AI search readiness. This skill is the free, open-source way to compute AAIV anywhere.

The full product — continuous AAIV monitoring, multi-page audits, citation history, competitor tracking, scheduled scans, Slack alerts — lives at **[getapexradar.com](https://getapexradar.com)**.

The skill stands on its own. Forever free.
