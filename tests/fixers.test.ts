import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import faqFixer from "../src/fixers/faq-schema/index.js";
import orgFixer from "../src/fixers/organization-schema/index.js";
import crawlerFixer from "../src/fixers/ai-crawler-access/index.js";

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "apex-test-"));
}

describe("ai-crawler-access fixer", () => {
  it("creates robots.txt with managed block when none exists", async () => {
    const root = await tmpDir();
    const res = await crawlerFixer.apply({ rootDir: root, framework: "static-html", dryRun: false, options: {} });
    expect(res.ok).toBe(true);
    const robots = await fs.readFile(path.join(root, "robots.txt"), "utf8");
    expect(robots).toMatch(/GPTBot/);
    expect(robots).toMatch(/ClaudeBot/);
    expect(robots).toMatch(/apex:ai-crawler-access/);
  });

  it("is idempotent — second run is a noop", async () => {
    const root = await tmpDir();
    await crawlerFixer.apply({ rootDir: root, framework: "static-html", dryRun: false, options: {} });
    const res2 = await crawlerFixer.apply({ rootDir: root, framework: "static-html", dryRun: false, options: {} });
    expect(res2.changes[0].action).toBe("noop");
  });
});

describe("faq-schema fixer", () => {
  it("scaffolds apex.faq.json when no source exists", async () => {
    const root = await tmpDir();
    const res = await faqFixer.apply({ rootDir: root, framework: "nextjs", dryRun: false, options: {} });
    expect(res.ok).toBe(true);
    const scaffold = JSON.parse(await fs.readFile(path.join(root, "apex.faq.json"), "utf8"));
    expect(scaffold.entries.length).toBeGreaterThan(0);
  });

  it("emits FAQPage JSON-LD when source has entries", async () => {
    const root = await tmpDir();
    await fs.writeFile(path.join(root, "apex.faq.json"), JSON.stringify({
      entries: [{ question: "What is it?", answer: "A thing." }],
    }), "utf8");
    const res = await faqFixer.apply({ rootDir: root, framework: "static-html", dryRun: false, options: {} });
    expect(res.ok).toBe(true);
    const out = await fs.readFile(path.join(root, "partials/apex-faq-schema.html"), "utf8");
    expect(out).toMatch(/FAQPage/);
    expect(out).toMatch(/What is it\?/);
  });
});

describe("organization-schema fixer", () => {
  it("scaffolds apex.org.json when missing", async () => {
    const root = await tmpDir();
    const res = await orgFixer.apply({ rootDir: root, framework: "nextjs", dryRun: false, options: {} });
    expect(res.ok).toBe(true);
    const scaffold = JSON.parse(await fs.readFile(path.join(root, "apex.org.json"), "utf8"));
    expect(scaffold.name).toBeDefined();
  });

  it("rejects scaffold-text name", async () => {
    const root = await tmpDir();
    await fs.writeFile(path.join(root, "apex.org.json"), JSON.stringify({
      name: "Replace With Your Brand",
      url: "https://example.com",
      description: "x",
    }), "utf8");
    const res = await orgFixer.apply({ rootDir: root, framework: "static-html", dryRun: false, options: {} });
    expect(res.ok).toBe(false);
  });
});
