import { promises as fs } from "node:fs";
import process from "node:process";
import { RadarAuditClient } from "../src/radar/audit-client.js";
import { RadarAivClient } from "../src/radar/aiv-client.js";
import { compareScans } from "../src/workflow/prove.js";

function input(name: string, fallback = ""): string {
  const v = process.env[`INPUT_${name.toUpperCase().replace(/-/g, "_")}`];
  return (v ?? fallback).trim();
}

function setOutput(name: string, value: string): void {
  const path = process.env.GITHUB_OUTPUT;
  if (!path) return;
  fs.appendFile(path, `${name}=${value.replace(/\n/g, "%0A")}\n`, "utf8").catch(() => undefined);
}

async function appendSummary(md: string): Promise<void> {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) { console.log(md); return; }
  await fs.appendFile(path, md + "\n", "utf8");
}

async function main(): Promise<number> {
  const token = input("radar-portal-token");
  const minAaiv = Number(input("min-aaiv", "0"));
  const failOnRegression = input("fail-on-regression", "false") === "true";

  if (!token) {
    console.error("apex-action: radar-portal-token is required");
    return 1;
  }

  const baseUrl = process.env.APEX_RADAR_BASE_URL || "https://app.getapexradar.com";
  const auditClient = new RadarAuditClient({ baseUrl, portalToken: token });
  const aivClient = new RadarAivClient({ baseUrl, portalToken: token });

  let exitCode = 0;
  const lines: string[] = ["## Apex AI Visibility", ""];

  try {
    const wrapper = await auditClient.getLatest();
    const audit = wrapper.result;
    const readinessScore = audit.readiness?.score ?? 0;
    setOutput("aaiv-score", String(readinessScore));
    setOutput("aeo-score", String(audit.aeoScore));

    lines.push(`**AAIV (readiness):** ${readinessScore}/100  ·  **AEO:** ${audit.aeoScore}/100  ·  **SEO:** ${audit.seoScore}/100`);
    if (audit.readiness) {
      lines.push("");
      lines.push(`- Are you understood? **${audit.readiness.score}/100** (${audit.readiness.label})`);
    }
    if (audit.citation) {
      if (audit.citation.state === "graded" && audit.citation.score !== null) {
        lines.push(`- Are you cited? **${audit.citation.score}/100**`);
      } else {
        lines.push(`- Are you cited? _pending — ${audit.citation.days_remaining}d remaining_`);
      }
    }

    const topFixes = audit.checks
      .filter((c) => c.status === "fail" && c.fixable)
      .sort((a, b) => {
        const cat = (a.category === "AEO" ? 0 : 1) - (b.category === "AEO" ? 0 : 1);
        if (cat !== 0) return cat;
        const order = { high: 0, medium: 1, low: 2 } as const;
        const ai = a.impact ? order[a.impact] : 1;
        const bi = b.impact ? order[b.impact] : 1;
        return ai - bi;
      })
      .slice(0, 5);
    setOutput("top-fixes", JSON.stringify(topFixes));

    if (topFixes.length) {
      lines.push("", "### Top fixes", "");
      for (const c of topFixes) {
        const impactTag = c.impact ? ` _(${c.impact})_` : "";
        lines.push(`- **[${c.category}] ${c.name}**${impactTag} — ${c.details}`);
      }
    } else {
      lines.push("", "_No fixable failures._");
    }

    if (minAaiv > 0 && readinessScore < minAaiv) {
      lines.push("", `⚠️ **AAIV ${readinessScore} is below threshold ${minAaiv}** — failing the job.`);
      exitCode = 1;
    }

    if (failOnRegression) {
      try {
        const scans = await aivClient.getScans();
        if (scans.length >= 2) {
          const sorted = [...scans].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          const delta = compareScans(sorted[sorted.length - 2].result, sorted[sorted.length - 1].result);
          if (delta.lostCitedEngines.length) {
            lines.push("", `🚨 **Regression: lost citations in** ${delta.lostCitedEngines.join(", ")}`);
            exitCode = 1;
          }
        }
      } catch (e: any) {
        lines.push("", `_prove check skipped: ${e?.message ?? e}_`);
      }
    }
  } catch (e: any) {
    lines.push("", `❌ Apex action failed: ${e?.message ?? e}`);
    exitCode = 1;
  }

  await appendSummary(lines.join("\n"));
  return exitCode;
}

main().then((code) => process.exit(code));
