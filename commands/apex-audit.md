---
name: apex-audit
description: Kick off a fresh Radar AEO scan.
args:
  - name: url
    description: Optional URL to scan. Defaults to the workspace site.
    required: false
---

Run a fresh Apex Radar audit.

## Run

If the user supplied a URL:

```bash
apex audit --url "<URL>"
```

Otherwise:

```bash
apex audit
```

## Then

The CLI returns a `scanId`. Tell the user:

- Scans typically complete in 30–90 seconds.
- Run `/apex-visibility` shortly after to read the results.
- Their Radar workspace also shows live progress at https://app.getapexradar.com.

## If it fails

If the command errors with "Radar portal token not found", run `/apex-connect` first.

If it returns a 4xx or 5xx, surface the status to the user verbatim and suggest checking quota (Scans 25/300, AIV 2/75 per month on standard plans).
