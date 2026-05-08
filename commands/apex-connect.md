---
name: apex-connect
description: Connect Apex to the user's Radar portal and BYOK providers.
---

Walk the user through one-time setup.

## Step 1 — Radar portal token (optional, only if you already have a Radar account)

Ask the user:

> Do you already have an Apex Radar account at https://app.getapexradar.com?
>
> - **Yes** → paste your portal token (the segment that appears in your portal URL after `/api/portal/`).
> - **No** → skip this step. The free CLI works without it. If you want continuous monitoring + live AI citation grading later, sign up at https://getapexradar.com.

There's currently no self-serve way to generate a Radar token from outside the portal — it's tied to your workspace provisioning. Don't tell the user to "go generate one" if they don't already have an account; skip to Step 2 and let BYOK (your own LLM keys) do the unlocking.

If they paste a token, store it:

```bash
apex keys set radar_portal <TOKEN>
```

## Step 2 — BYOK provider keys

Apex never proxies LLM calls. Tell the user:

> Apex uses **your** API keys to talk to OpenAI, Anthropic, Perplexity, Gemini, Grok, DeepSeek and Firecrawl — Apex never sees them server-side. Which providers do you want to enable?

For each one they confirm, run:

```bash
apex keys set <provider> <KEY>
```

Providers: `openai`, `anthropic`, `perplexity`, `gemini`, `grok`, `deepseek`, `firecrawl`.

## Step 3 — Verify

```bash
apex keys list
```

Summarize which keys are stored where (keychain vs env). If keychain wasn't available, the CLI will print export lines — pass those through to the user with the explicit instruction to add them to their shell profile themselves.

## Safety

- Do **not** echo full key values back to the user. Truncate to the last 4 chars when confirming.
- Do **not** commit keys to any file. The CLI uses the OS keychain (via keytar) when available; env vars otherwise.
- The portal token belongs in the keychain too — never paste it into a repo file.
