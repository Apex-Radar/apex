# Attributions

Apex stands on the shoulders of open-source AEO work. This file credits the upstream projects that informed its check vocabulary, methodology, and design.

If you use Apex in your own product, please preserve this file. If you find work here that should be credited and isn't, open an issue at <https://github.com/Apex-Radar/apex/issues>.

---

## aeo.js

- **Project:** <https://github.com/aeoschool/aeo.js>
- **Authors:** AEO School contributors
- **License:** MIT
- **Upstream license file:** <https://github.com/aeoschool/aeo.js/blob/main/LICENSE>

**What Apex took:** check IDs and pass/warn/fail thresholds for several AEO signals — JSON-LD presence, FAQ schema, Article schema, heading structure, and Q&A pattern detection. The score-band cutoffs in `src/local-audit/checks/content.ts` and `src/local-audit/checks/citation-hooks.ts` follow aeo.js conventions where they exist.

The Apex implementations are independent code, but the *taxonomy* — the names and meanings of the checks — is aeo.js's contribution to the field, and we use it gratefully.

---

## goose-aeo

- **Project:** <https://github.com/block/goose-aeo>
- **Author:** Block, Inc.
- **License:** Apache License 2.0
- **Upstream license file:** <https://github.com/block/goose-aeo/blob/main/LICENSE>

**What Apex took:** the architectural pattern of pairing a diagnostic engine with idempotent, dry-run-first **fixers** — code patches that read the user's repo, propose a change, and apply only after confirmation. The fixer contract in `src/fixers/_contract.ts` (read → diff → preview → apply) is directly inspired by goose-aeo's approach.

The fixer code in this repo is original. The pattern of treating fixes as first-class, repo-aware operations is goose-aeo's idea, and it's the right one.

---

## aeo-strategist-claude-skill

- **Project:** <https://github.com/indranilbanerjee/aeo-strategist-claude-skill>
- **Author:** Indranil Banerjee
- **License:** MIT
- **Upstream license file:** <https://github.com/indranilbanerjee/aeo-strategist-claude-skill/blob/main/LICENSE>

**What Apex took:** the conceptual proof that AEO belongs inside Claude as a skill, and the approach of using `SKILL.md` plus a folder of slash command specs to teach Claude a domain vocabulary. Indranil's work was the existence-proof that this category had legs.

Apex's check engine, scoring, and fixers are independent. The packaging shape — skill manifest plus slash commands — is informed by his project's design.

---

## Schema.org

- **Project:** <https://schema.org>
- **License:** Schema.org vocabulary released under CC BY-SA 3.0

The JSON-LD schemas Apex generates (Organization, FAQPage, Article, HowTo, Review) are defined by Schema.org. We follow the public vocabulary verbatim and do not redistribute schema definitions themselves.

---

## License

Apex itself is released under the [MIT License](LICENSE). Every line of code in this repo is either:

- Original work by Apex contributors, or
- Inspired by (not copied from) the projects listed above

If you believe any part of Apex contains code that should carry an upstream license header it doesn't currently have, please open an issue and we will correct it immediately.

---

## A note on competition

Apex is built by the team behind [Apex Radar](https://getapexradar.com), a hosted AEO monitoring product. We chose to ship this skill as MIT for two reasons:

1. **AEO is too new for gatekeeping.** The category needs more practitioners, more checks, more shared vocabulary. Open source is how that happens.
2. **The skill and the SaaS solve different problems.** The skill is "diagnose this URL right now"; Radar is "watch my whole site every day." Both should exist; only one should be free.

If Apex helps you, that's enough. If you graduate to needing continuous monitoring, multi-engine citation tracking, or competitive benchmarking, Radar is here.
