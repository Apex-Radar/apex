// Local cost ledger. Records actual spend per BYOK call so users can audit.
// Stored at ~/.apex/ledger.jsonl (append-only, one JSON per line).

import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { ProviderId } from "../keys/manager.js";

export interface LedgerEntry {
  ts: string;
  provider: ProviderId;
  operation: string;       // e.g. "answer-gap", "brief", "citation-probe"
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
  notes?: string;
}

const LEDGER_DIR = path.join(homedir(), ".apex");
const LEDGER_PATH = path.join(LEDGER_DIR, "ledger.jsonl");

export async function appendLedger(entry: LedgerEntry): Promise<void> {
  await fs.mkdir(LEDGER_DIR, { recursive: true });
  await fs.appendFile(LEDGER_PATH, JSON.stringify(entry) + "\n", "utf8");
}

export async function readLedger(limit = 200): Promise<LedgerEntry[]> {
  try {
    const raw = await fs.readFile(LEDGER_PATH, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const tail = lines.slice(-limit);
    return tail.map((l) => JSON.parse(l) as LedgerEntry);
  } catch (e: any) {
    if (e?.code === "ENOENT") return [];
    throw e;
  }
}

export interface LedgerSummary {
  totalUsd: number;
  byProvider: Record<string, number>;
  byOperation: Record<string, number>;
  count: number;
}

export function summarize(entries: LedgerEntry[]): LedgerSummary {
  const out: LedgerSummary = { totalUsd: 0, byProvider: {}, byOperation: {}, count: entries.length };
  for (const e of entries) {
    out.totalUsd += e.estimatedUsd;
    out.byProvider[e.provider] = (out.byProvider[e.provider] ?? 0) + e.estimatedUsd;
    out.byOperation[e.operation] = (out.byOperation[e.operation] ?? 0) + e.estimatedUsd;
  }
  out.totalUsd = Number(out.totalUsd.toFixed(4));
  for (const k of Object.keys(out.byProvider)) out.byProvider[k] = Number(out.byProvider[k].toFixed(4));
  for (const k of Object.keys(out.byOperation)) out.byOperation[k] = Number(out.byOperation[k].toFixed(4));
  return out;
}
