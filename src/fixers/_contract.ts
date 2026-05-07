// Shared shape every fixer must implement.

import type { Framework } from "../core/framework/detect.js";

export interface FixerContext {
  rootDir: string;
  framework: Framework;
  dryRun: boolean;
  options: Record<string, string | boolean>;
}

export type ChangeAction = "create" | "update" | "skip" | "noop";

export interface ChangeRecord {
  action: ChangeAction;
  path: string;          // relative to rootDir
  bytes?: number;
  reason?: string;
}

export interface FixerResult {
  ok: boolean;
  summary: string;
  changes: ChangeRecord[];
  notes: string[];
}

export interface Fixer {
  id: string;
  title: string;
  description: string;
  appliesTo: Framework[] | "all";
  apply(ctx: FixerContext): Promise<FixerResult>;
}

// Helpers
import { promises as fs } from "node:fs";
import path from "node:path";

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function readIfExists(p: string): Promise<string | null> {
  try { return await fs.readFile(p, "utf8"); } catch (e: any) {
    if (e?.code === "ENOENT") return null;
    throw e;
  }
}

export async function writeFile(rootDir: string, rel: string, content: string, dryRun: boolean): Promise<ChangeRecord> {
  const abs = path.join(rootDir, rel);
  const existed = (await readIfExists(abs)) !== null;
  if (dryRun) {
    return { action: existed ? "update" : "create", path: rel, bytes: Buffer.byteLength(content, "utf8"), reason: "dry-run" };
  }
  await ensureDir(path.dirname(abs));
  await fs.writeFile(abs, content, "utf8");
  return { action: existed ? "update" : "create", path: rel, bytes: Buffer.byteLength(content, "utf8") };
}
