/**
 * Regression coverage for the BYOK→inline-probes pipeline. These tests
 * would have caught the v0.1.5–v0.2.0 gap where BYOK keys were accepted
 * but did nothing visible in `apex visibility`.
 *
 * Strategy: mock the provider APIs by injecting fetch implementations,
 * call the per-provider probe functions and the audit-merger directly.
 * No live network. No real keys.
 */
import { describe, it, expect } from "vitest";
import {
  runOpenAiProbe,
  probeResultToChecks,
} from "../src/byok/openai-visibility-probe.js";
import {
  runAnthropicProbe,
  anthropicProbeToChecks,
} from "../src/byok/anthropic-visibility-probe.js";
import {
  runPerplexityProbe,
  perplexityProbeToChecks,
} from "../src/byok/perplexity-visibility-probe.js";
import { compositeChecks } from "../src/byok/composite-checks.js";
import { applyInlineProbeResults, runLocalAudit, CITATION_CHECK_STUBS } from "../src/local-audit/index.js";
import type { AuditResult } from "../src/radar/types.js";

// Tiny in-process HTML for runLocalAudit smoke. The audit's `fetch` lives
// in src/local-audit/fetch.ts; we monkey-patch nothing — just give the
// auditor a URL that resolves to a stubbed response in node by setting
// up a mock implementation on globalThis.fetch.
const STUB_HTML = `<!doctype html><html lang="en"><head>
  <title>Acme Tools — best CRM for SMBs</title>
  <meta name="description" content="Acme Tools is a CRM platform for small business sales teams.">
  <meta property="og:site_name" content="Acme Tools">
  <link rel="canonical" href="https://acme.example.com/">
</head><body>
  <h1>Acme Tools</h1>
  <p>${"This is a paragraph about Acme Tools and how it helps SMBs grow. ".repeat(20)}</p>
  <h2>How does Acme Tools help small businesses?</h2>
  <p>${"Acme Tools provides CRM, marketing automation, and sales pipeline tracking. ".repeat(15)}</p>
</body></html>`;

function fakeFetch(body: any, status = 200): typeof fetch {
  return (async (_url: any, _init: any) => {
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
      json: async () => body,
    } as Response;
  }) as any;
}

describe("OpenAI inline probe", () => {
  it("returns shaped result for a brand-cited response", async () => {
    const fakeApiResponse = {
      choices: [
        {
          message: {
            content:
              "Acme Tools is a leading CRM platform for SMBs. Visit https://acme.example.com for details. Competitors include Salesforce and HubSpot.",
          },
        },
      ],
    };
    const result = await runOpenAiProbe({
      apiKey: "sk-test",
      query: "best CRM for SMBs",
      brand: "Acme Tools",
      fetchImpl: fakeFetch(fakeApiResponse),
    });
    expect(result.cited).toBe(true);
    expect(result.mentioned).toBe(true);
    expect(result.brandSpelledCorrectly).toBe(true);
    expect(result.competitors).toContain("Salesforce");
    expect(result.competitors).toContain("HubSpot");
    expect(result.estimatedUsd).toBeGreaterThan(0);
  });

  it("converts probe result into 5 graded checks (chatgpt-side slots)", () => {
    const result = {
      cited: true,
      mentioned: true,
      brandSpelledCorrectly: true,
      competitors: ["Salesforce"],
      excerpt: "Acme Tools is a leading CRM. ".repeat(10),
      estimatedUsd: 0.0001,
      query: "best CRM",
    };
    const checks = probeResultToChecks(result, "Acme Tools");
    const ids = checks.map((c) => c.id).sort();
    expect(ids).toEqual([
      "ai-sentiment",
      "brand-accuracy",
      "chatgpt-citation",
      "chatgpt-competitors",
      "service-description",
    ]);
    // chatgpt-citation = pass when cited
    expect(checks.find((c) => c.id === "chatgpt-citation")?.status).toBe("pass");
    // brand-accuracy = pass when spelled correctly
    expect(checks.find((c) => c.id === "brand-accuracy")?.status).toBe("pass");
  });

  it("grades chatgpt-citation as fail when brand absent", () => {
    const result = {
      cited: false,
      mentioned: false,
      brandSpelledCorrectly: false,
      competitors: ["Salesforce"],
      excerpt: "Salesforce is a CRM platform.",
      estimatedUsd: 0.0001,
      query: "best CRM",
    };
    const checks = probeResultToChecks(result, "Acme Tools");
    expect(checks.find((c) => c.id === "chatgpt-citation")?.status).toBe("fail");
    expect(checks.find((c) => c.id === "chatgpt-competitors")?.status).toBe("fail");
  });
});

describe("Anthropic inline probe", () => {
  it("returns shaped result and grades claude-citation", async () => {
    const result = await runAnthropicProbe({
      apiKey: "sk-ant-test",
      query: "best CRM for SMBs",
      brand: "Acme Tools",
      fetchImpl: fakeFetch({
        content: [
          { text: "Acme Tools is a popular SMB CRM, see https://acme.example.com." },
        ],
      }),
    });
    expect(result.cited).toBe(true);
    const checks = anthropicProbeToChecks(result, "Acme Tools");
    expect(checks).toHaveLength(1);
    expect(checks[0].id).toBe("claude-citation");
    expect(checks[0].status).toBe("pass");
  });
});

describe("Perplexity inline probe", () => {
  it("returns shaped result with sources and grades both perplexity slots", async () => {
    const result = await runPerplexityProbe({
      apiKey: "pplx-test",
      query: "best CRM for SMBs",
      brand: "Acme Tools",
      domain: "acme.example.com",
      fetchImpl: fakeFetch({
        choices: [
          {
            message: {
              content:
                "Acme Tools is a popular SMB CRM. See [1] and [2] for more.",
            },
          },
        ],
        citations: [
          "https://acme.example.com/about",
          "https://other.example/post",
        ],
      }),
    });
    expect(result.cited).toBe(true);
    expect(result.sourceLinked).toBe(true);
    const checks = perplexityProbeToChecks(result, "Acme Tools");
    expect(checks.map((c) => c.id).sort()).toEqual([
      "perplexity-citation",
      "perplexity-source",
    ]);
    expect(checks.find((c) => c.id === "perplexity-source")?.status).toBe("pass");
  });

  it("marks source as warn when cited but no source on user domain", async () => {
    const result = await runPerplexityProbe({
      apiKey: "pplx-test",
      query: "best CRM",
      brand: "Acme Tools",
      domain: "acme.example.com",
      fetchImpl: fakeFetch({
        choices: [{ message: { content: "Acme Tools is great. See https://other.example." } }],
        citations: ["https://other.example/post"],
      }),
    });
    expect(result.sourceLinked).toBe(false);
    const checks = perplexityProbeToChecks(result, "Acme Tools");
    expect(checks.find((c) => c.id === "perplexity-source")?.status).toBe("warn");
  });
});

describe("Composite checks", () => {
  it("returns empty when fewer than 2 providers ran", () => {
    expect(compositeChecks({}, "Acme")).toHaveLength(0);
    expect(
      compositeChecks(
        { openai: { cited: true, mentioned: true } as any },
        "Acme",
      ),
    ).toHaveLength(0);
  });

  it("fills 5 composite slots when ≥2 providers ran", () => {
    const checks = compositeChecks(
      {
        openai: { cited: true, mentioned: true } as any,
        anthropic: { cited: true, mentioned: true } as any,
        perplexity: { cited: false, mentioned: true } as any,
      },
      "Acme",
    );
    expect(checks.map((c) => c.id).sort()).toEqual([
      "ai-citation-test",
      "ai-query-coverage",
      "ai-readiness-composite",
      "ai-readiness-estimate",
      "multi-provider",
    ]);
    expect(checks.find((c) => c.id === "multi-provider")?.status).toBe("pass");
  });
});

describe("applyInlineProbeResults", () => {
  it("flips a stub from skipped to graded and removes ceiling when all 13 land", async () => {
    // Build a synthetic AuditResult close to what runLocalAudit would emit.
    // We can't easily call runLocalAudit without a real fetch; build by hand.
    const stubs = CITATION_CHECK_STUBS.map((s) => ({
      id: s.id,
      title: s.title,
      category: "AEO" as const,
      status: "skipped" as const,
      message: "stub",
    }));
    const audit: AuditResult = {
      url: "https://acme.example.com",
      overallScore: 50,
      seoScore: 70,
      aeoScore: 30,
      aeoCeiling: 75,
      checks: [
        ...stubs,
        // Add 36 dummy non-citation AEO passes so denominator is honest.
        ...Array.from({ length: 36 }, (_, i) => ({
          id: `dummy-aeo-${i}`,
          title: `Dummy AEO ${i}`,
          category: "AEO" as const,
          status: "pass" as const,
          message: "ok",
        })),
      ],
      readiness: { score: 50, label: "fair", factors: [] },
      citation: { state: "unknown", score: null, days_remaining: null },
      aiCitation: { chatgptCited: false, perplexityCited: false },
      source: "local",
    };

    // Inject 13 graded versions (matching all stub IDs) — should drop the ceiling.
    const graded = stubs.map((s) => ({ ...s, status: "pass" as const, message: "graded" }));
    const merged = applyInlineProbeResults(audit, graded);

    // No more skipped citation checks.
    expect(merged.checks.filter((c) => c.status === "skipped")).toHaveLength(0);
    // aeoCeiling should be removed (>=100).
    expect((merged as any).aeoCeiling).toBeUndefined();
  });

  it("keeps the ceiling when only some slots flip", () => {
    const stubs = CITATION_CHECK_STUBS.map((s) => ({
      id: s.id,
      title: s.title,
      category: "AEO" as const,
      status: "skipped" as const,
      message: "stub",
    }));
    const audit: AuditResult = {
      url: "https://acme.example.com",
      overallScore: 50,
      seoScore: 70,
      aeoScore: 30,
      aeoCeiling: 75,
      checks: [
        ...stubs,
        ...Array.from({ length: 36 }, (_, i) => ({
          id: `dummy-aeo-${i}`,
          title: `Dummy ${i}`,
          category: "AEO" as const,
          status: "pass" as const,
          message: "ok",
        })),
      ],
      readiness: { score: 50, label: "fair", factors: [] },
      citation: { state: "unknown", score: null, days_remaining: null },
      aiCitation: { chatgptCited: false, perplexityCited: false },
      source: "local",
    };

    // Inject only the 5 chatgpt-side stubs as graded.
    const partial = ["chatgpt-citation", "chatgpt-competitors", "brand-accuracy", "service-description", "ai-sentiment"]
      .map((id) => ({
        id,
        title: id,
        category: "AEO" as const,
        status: "pass" as const,
        message: "graded",
      }));
    const merged = applyInlineProbeResults(audit, partial);

    // Still 8 skipped checks remain.
    expect(merged.checks.filter((c) => c.status === "skipped")).toHaveLength(8);
    // Ceiling rose but did not vanish.
    expect((merged as any).aeoCeiling).toBeDefined();
    expect((merged as any).aeoCeiling).toBeGreaterThan(75);
    expect((merged as any).aeoCeiling).toBeLessThan(100);
  });
});
