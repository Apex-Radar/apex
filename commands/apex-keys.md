---
name: apex-keys
description: Manage BYOK API keys for Apex (keychain or env vars).
args:
  - name: action
    description: One of list, set, remove.
    required: false
  - name: provider
    description: Provider id (openai, anthropic, perplexity, gemini, grok, deepseek, firecrawl).
    required: false
---

## If no action

```bash
apex keys list
```

Show the user which providers are configured (env / keychain / missing). Truncate any displayed values — never print full key contents.

## set

Ask the user to paste the key. **Do not** suggest they paste it into a repo file or commit it.

```bash
apex keys set <PROVIDER> <KEY>
```

If keytar isn't available, the CLI prints an `export …` line. Pass that through verbatim and tell the user to add it to their shell profile themselves.

## remove

```bash
apex keys remove <PROVIDER>
```

## Important

- Apex never proxies LLM calls — keys go straight from the user's machine to the provider.
- Do not echo full keys back into the chat. Confirm by last 4 chars only.
