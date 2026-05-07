---
name: apex-gaps
description: List Answer Gap rows ranked by impact.
args:
  - name: max
    description: Limit number of rows shown (default 20).
    required: false
  - name: briefs
    description: If "true", also generate brief specs for the top 5 gaps.
    required: false
---

Show the user where AI engines are answering questions in their category — but citing competitors instead of them.

**Tier:** 🟣⊕ Radar Portal **add-on** — requires the Answer Gap module on the user's Radar workspace, which is separate from the AIV scan included with a portal token. If the CLI returns the "Answer Gap data isn't available" message, surface it verbatim and do not retry — the module isn't enabled. Do not offer `/apex-gaps` again within the same session after that signal. Pivot to deriving fixes from the `/apex-visibility` scorecard or `/apex-citation` probes instead.

## Run

If the user wants briefs too:

```bash
apex gaps --max <MAX> --briefs --json
```

Otherwise:

```bash
apex gaps --max <MAX> --json
```

(Use `--max 20` if no value supplied.)

## Read the output

The JSON has `rows[]` (already ranked worst-gap-first) and optionally `briefs[]`.

For each top row:
- `query` — what someone asked an AI engine
- `engine` — which engine
- `cited` — were *they* cited?
- `competitorsCited[]` — who *was* cited

## Summarize for the user

1. **The top 5 gaps** as a numbered list:
   - `[engine] "query" — cited: <competitors>`
2. If `--briefs` was requested, present each `briefSpec` as:
   - **Angle:** one-line strategic angle
   - **Format hints:** lede, definitional sentence, optional table, FAQ
   - **Schema:** which schema.org types fit
3. Offer next step: "Want me to draft the actual brief content for any of these? Pick a number." If they pick one, write the brief locally as `briefs/<slug>.md` — but ask permission before writing.

## Important

- Mention rate is reported as a fraction (0–1). Render it as a percentage but **cap at 100%**. If you ever see a value >1 from the API, flag it as a Radar bug and don't display the raw number.
- Do not call any LLM API as part of `/apex-gaps` — this command only reads Radar data.
