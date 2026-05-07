import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runLocalAudit } from "../src/local-audit/index.js";

const FIXTURE = `<!doctype html>
<html><head>
  <title>Test Page About AEO</title>
  <meta name="description" content="A reasonably-long meta description that explains what this test page is about for crawlers and humans.">
  <link rel="canonical" href="https://example.test/">
  <meta property="og:title" content="Test"><meta property="og:type" content="website">
  <meta property="og:url" content="https://example.test/"><meta property="og:image" content="x">
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"Organization","name":"X","sameAs":["https://linkedin.com/company/x"]}
  </script>
</head><body>
  <h1>Single H1</h1>
  <h2>What is AEO?</h2>
  <h2>How does it work?</h2>
  <h3>Why does it matter?</h3>
  <p>${"word ".repeat(700)}</p>
  <a href="https://example.com">ext</a>
  <a href="https://other.com">ext</a>
  <a href="https://third.com">ext</a>
</body></html>`;

describe("runLocalAudit", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: any) => {
      const u = String(url);
      if (u.endsWith("/robots.txt")) {
        return new Response("User-agent: *\nAllow: /", { status: 200 });
      }
      if (u.endsWith("/llms.txt")) {
        return new Response("not found", { status: 404 });
      }
      return new Response(FIXTURE, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }) as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("produces a well-formed AuditResult against a stubbed fetch", async () => {
    const result = await runLocalAudit({ url: "https://example.test/" });

    expect(result.source).toBe("local");
    expect(result.url).toBe("https://example.test/");
    expect(result.checks.length).toBeGreaterThan(5);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.citation.state).toBe("unknown");
  });

  it("includes both SEO and AEO checks", async () => {
    const result = await runLocalAudit({ url: "https://example.test/" });
    const seo = result.checks.filter((c) => c.category === "SEO");
    const aeo = result.checks.filter((c) => c.category === "AEO");
    expect(seo.length).toBeGreaterThan(0);
    expect(aeo.length).toBeGreaterThan(0);
  });

  it("flags question-style headings as a Question Headings pass", async () => {
    // Renamed 2026-05-07 during parity port: legacy "qa-pattern" became
    // "question-headings" with parity-faithful thresholds (5+ pass, 2+ warn).
    // Fixture has 3 question headings ("What is AEO?", "How does it work?",
    // "Why does it matter?") → warn under the new threshold.
    const result = await runLocalAudit({ url: "https://example.test/" });
    const qh = result.checks.find((c) => c.id === "question-headings");
    expect(qh).toBeDefined();
    expect(qh?.title).toBe("Question Headings");
    expect(["pass", "warn"]).toContain(qh?.status);
  });
});
