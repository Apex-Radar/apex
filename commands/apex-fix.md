---
name: apex-fix
description: Apply an Apex fixer (schema, crawler access, etc.).
args:
  - name: fixer
    description: Fixer ID. One of ai-crawler-access, faq-schema, organization-schema.
    required: false
  - name: dry-run
    description: If "true", print planned changes without writing.
    required: false
---

Apply a fixable AAIV/AEO issue.

## If no fixer supplied

Run:

```bash
apex fix
```

This prints the available fixer list. Show it to the user and ask which one they want.

## When the user picks a fixer

**Always run dry-run first**:

```bash
apex fix <FIXER_ID> --dry-run
```

Show the user:
- Detected framework
- Files that would be created or updated (with paths)
- Notes from the fixer (where to import the snippet, validation tips)

Then ask: "Apply for real?"

If yes:

```bash
apex fix <FIXER_ID>
```

## Fixer notes

- **`ai-crawler-access`** — edits `robots.txt`, idempotent via apex managed-block markers. Safe to rerun.
- **`faq-schema`** — needs `apex.faq.json` at repo root. If missing, the fixer scaffolds it; tell the user to fill it in with their real Q&A and rerun.
- **`organization-schema`** — needs `apex.org.json` at repo root. Same scaffold-then-rerun flow. The description field appears verbatim in LLM answers — write it carefully.

## Important

- Fixers never inject snippets into layout files automatically. After a fix, walk the user through the one-line import they need to add (the fixer prints the exact path in `notes`).
- Validate emitted JSON-LD at https://validator.schema.org/ after deploying.
