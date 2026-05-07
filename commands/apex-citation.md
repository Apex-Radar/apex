---
name: apex-citation
description: BYOK ad-hoc citation probe — does an AI engine cite the user's brand for a given query?
args:
  - name: brand
    description: Brand name to match in responses (required).
    required: true
  - name: query
    description: A single query to probe.
    required: false
  - name: queries-file
    description: Path to a newline-separated file of queries.
    required: false
  - name: provider
    description: Provider id. Defaults to openai. (More providers in upcoming releases.)
    required: false
---

Run an ad-hoc citation probe using the user's own provider key.

## Pre-flight

1. Confirm the brand name is provided.
2. Confirm at least one of `query` or `queries-file` is provided.
3. Verify the BYOK key is set:

```bash
apex keys list
```

If the chosen provider's key is missing, ask the user to set it via `/apex-keys` first — do not proceed.

## Cost preview

Before running, tell the user the estimated cost. The CLI prints it after the run, but to preview, mention: "Each probe is ~$0.001–$0.005 depending on provider. The exact total will be appended to your local ledger (`apex costs`)."

## Run

Single query:

```bash
apex citation --provider <PROVIDER> --brand "<BRAND>" --query "<QUERY>" --json
```

Multiple queries from file:

```bash
apex citation --provider <PROVIDER> --brand "<BRAND>" --queries-file <PATH> --json
```

## Read the output

For each result: `cited` (true if brand is mentioned AND a URL appears in the response), `mentioned`, `excerpt`.

## Summarize

- Cited X / total
- Mentioned Y / total
- For uncited queries, suggest running `/apex-gaps` to see if Radar already has those gaps tracked, and `/apex-fix faq-schema` if the queries look like FAQ candidates.
- Note that ad-hoc probes are **not** equivalent to Radar's full AIV scan — they're a quick check, not the official AAIV signal.

## Safety

- Never echo the API key back. Reference it as "your <provider> key".
- The probe writes to `~/.apex/ledger.jsonl` — surface the per-probe cost so the user sees what they spent.
