---
name: apex-trends
description: Show AI visibility trend over time.
---

## Run

```bash
apex trends --json
```

## Read the output

Array of points with `scannedAt`, `visibilityScore`, `reportId`, `filled` (true = official scan, false = comparison marker).

## Summarize for the user

1. **Direction:** is the trend up, flat, or down across the last 4 scans?
2. **Latest score** vs. **first score** in the window.
3. **Notable inflections:** any scan-to-scan delta ≥ 0.5 points (highlight as a meaningful move).

If trend is downward, recommend `/apex-defend` to investigate which engines or queries are losing ground.

## Important

- Filled markers are official scans. Hollow markers are user-initiated comparison runs and shouldn't be used as the canonical baseline.
- Do not extrapolate or forecast — just describe what the data shows.
