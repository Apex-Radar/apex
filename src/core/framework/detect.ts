// Detect the project framework so fixers know where to write files.
// Pure filesystem inspection — no network, no execution.

import { promises as fs } from "node:fs";
import path from "node:path";

export type Framework = "nextjs" | "astro" | "wordpress" | "static-html" | "unknown";

export interface DetectionResult {
  framework: Framework;
  confidence: "high" | "medium" | "low";
  rootDir: string;
  signals: string[];
}

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

async function readJson(p: string): Promise<any | null> {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; }
}

export async function detectFramework(rootDir = process.cwd()): Promise<DetectionResult> {
  const signals: string[] = [];

  if (await exists(path.join(rootDir, "wp-config.php"))) {
    return { framework: "wordpress", confidence: "high", rootDir, signals: ["wp-config.php"] };
  }

  const pkg = await readJson(path.join(rootDir, "package.json"));
  if (pkg) {
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    if (deps.next) {
      signals.push("package.json:next");
      return { framework: "nextjs", confidence: "high", rootDir, signals };
    }
    if (deps.astro) {
      signals.push("package.json:astro");
      return { framework: "astro", confidence: "high", rootDir, signals };
    }
  }

  if (await exists(path.join(rootDir, "next.config.js")) || await exists(path.join(rootDir, "next.config.mjs"))) {
    return { framework: "nextjs", confidence: "medium", rootDir, signals: ["next.config"] };
  }
  if (await exists(path.join(rootDir, "astro.config.mjs")) || await exists(path.join(rootDir, "astro.config.ts"))) {
    return { framework: "astro", confidence: "medium", rootDir, signals: ["astro.config"] };
  }

  if (await exists(path.join(rootDir, "index.html"))) {
    return { framework: "static-html", confidence: "medium", rootDir, signals: ["index.html"] };
  }

  return { framework: "unknown", confidence: "low", rootDir, signals };
}
