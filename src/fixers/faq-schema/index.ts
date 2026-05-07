// Apex fixer: FAQ schema (FAQPage JSON-LD).
//
// Strategy:
//   1. Look for an FAQ source file at the repo root: apex.faq.json (preferred)
//      or apex.faq.yaml / faq.json / data/faq.json.
//   2. If none exists, scaffold apex.faq.json with a worked example and stop
//      (no schema written until the user fills in real Q&A).
//   3. Validate each entry has a non-empty question + answer.
//   4. Emit a single FAQPage JSON-LD object to a framework-appropriate location:
//        - Next.js (app router):   app/_apex/faq-schema.tsx (component)
//        - Next.js (pages router): pages/_apex-faq-schema.tsx (component)
//        - Astro:                  src/components/ApexFaqSchema.astro
//        - static-html:            partials/apex-faq-schema.html (raw <script>)
//        - wordpress:              apex-faq-schema.html (paste into footer/snippet plugin)
//        - unknown:                apex-faq-schema.json (raw JSON-LD)
//   5. All emitted files are wrapped in apex managed-block markers when the
//      output format supports comments.
//
// The fixer never injects the snippet into a layout file automatically —
// it tells the user exactly where to import/include it. This keeps the fix
// safe and reviewable.

import path from "node:path";
import { promises as fs } from "node:fs";
import type { Fixer, FixerContext, FixerResult, ChangeRecord } from "../_contract.js";
import { writeFile, readIfExists } from "../_contract.js";

const APEX_START_HTML = "<!-- >>> apex:faq-schema — managed block — do not edit between markers -->";
const APEX_END_HTML   = "<!-- <<< apex:faq-schema -->";
const APEX_START_TS   = "// >>> apex:faq-schema — managed block — do not edit between markers";
const APEX_END_TS     = "// <<< apex:faq-schema";

interface FaqEntry {
  question: string;
  answer: string;          // plain text or simple HTML — kept verbatim
  url?: string;            // optional canonical URL for the answer
}

interface FaqFile {
  name?: string;           // optional FAQPage name
  url?: string;            // optional canonical page URL
  inLanguage?: string;     // BCP-47, e.g. "en"
  entries: FaqEntry[];
}

const SCAFFOLD_FAQ: FaqFile = {
  name: "Frequently Asked Questions",
  inLanguage: "en",
  entries: [
    {
      question: "What does your product do?",
      answer:
        "Replace this with a one-paragraph plain-language answer. Lead with a verbatim definition LLMs can lift. Keep it under 80 words.",
    },
    {
      question: "Who is it for?",
      answer:
        "Describe your ideal user in concrete terms (role, company size, problem). Avoid marketing language — LLMs reward specificity.",
    },
    {
      question: "How is it priced?",
      answer:
        "State the pricing model in one sentence. If you have a free tier, lead with that. Include the smallest paid step.",
    },
  ],
};

async function findFaqSource(rootDir: string): Promise<{ path: string; raw: string } | null> {
  const candidates = ["apex.faq.json", "apex.faq.yaml", "apex.faq.yml", "faq.json", "data/faq.json"];
  for (const rel of candidates) {
    const abs = path.join(rootDir, rel);
    const raw = await readIfExists(abs);
    if (raw !== null) return { path: rel, raw };
  }
  return null;
}

function parseFaq(rel: string, raw: string): FaqFile {
  if (rel.endsWith(".json")) {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) return { entries: j };
    return j as FaqFile;
  }
  // Minimal YAML support: very small inline parser sufficient for "key: value" + "- question:"
  // For real YAML, users should prefer JSON. We do a best-effort parse.
  const lines = raw.split("\n");
  const out: FaqFile = { entries: [] };
  let cur: FaqEntry | null = null;
  for (const ln of lines) {
    const m1 = ln.match(/^\s*-\s*question:\s*(.+?)\s*$/);
    if (m1) { if (cur) out.entries.push(cur); cur = { question: stripQuotes(m1[1]), answer: "" }; continue; }
    const m2 = ln.match(/^\s*answer:\s*(.+?)\s*$/);
    if (m2 && cur) { cur.answer = stripQuotes(m2[1]); continue; }
    const m3 = ln.match(/^\s*url:\s*(.+?)\s*$/);
    if (m3 && cur) { cur.url = stripQuotes(m3[1]); continue; }
    const m4 = ln.match(/^name:\s*(.+?)\s*$/);
    if (m4) { out.name = stripQuotes(m4[1]); continue; }
    const m5 = ln.match(/^inLanguage:\s*(.+?)\s*$/);
    if (m5) { out.inLanguage = stripQuotes(m5[1]); continue; }
    const m6 = ln.match(/^url:\s*(.+?)\s*$/);
    if (m6 && !cur) { out.url = stripQuotes(m6[1]); continue; }
  }
  if (cur) out.entries.push(cur);
  return out;
}

function stripQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, "").trim();
}

function validate(faq: FaqFile): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(faq.entries) || faq.entries.length === 0) {
    errors.push("entries[] is empty — add at least one Q&A pair");
  }
  faq.entries?.forEach((e, i) => {
    if (!e.question?.trim()) errors.push(`entries[${i}].question is empty`);
    if (!e.answer?.trim())   errors.push(`entries[${i}].answer is empty`);
    if (e.answer && /lorem ipsum/i.test(e.answer)) errors.push(`entries[${i}].answer is placeholder text`);
  });
  return { ok: errors.length === 0, errors };
}

function buildJsonLd(faq: FaqFile): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    ...(faq.name ? { name: faq.name } : {}),
    ...(faq.url ? { url: faq.url } : {}),
    ...(faq.inLanguage ? { inLanguage: faq.inLanguage } : {}),
    mainEntity: faq.entries.map((e) => ({
      "@type": "Question",
      name: e.question,
      ...(e.url ? { url: e.url } : {}),
      acceptedAnswer: {
        "@type": "Answer",
        text: e.answer,
      },
    })),
  };
}

function escapeForScript(json: string): string {
  // Prevent </script> breakouts inside JSON-LD payloads.
  return json.replace(/<\/(script)/gi, "<\\/$1");
}

function htmlSnippet(jsonLd: object): string {
  const json = escapeForScript(JSON.stringify(jsonLd, null, 2));
  return [
    APEX_START_HTML,
    `<script type="application/ld+json">`,
    json,
    `</script>`,
    APEX_END_HTML,
    "",
  ].join("\n");
}

function nextAppComponent(jsonLd: object): string {
  const json = escapeForScript(JSON.stringify(jsonLd));
  return [
    APEX_START_TS,
    `// Generated by apex fix faq-schema. Import from app/layout.tsx or any page:`,
    `//   import ApexFaqSchema from "./_apex/faq-schema";`,
    `//   <ApexFaqSchema />`,
    `export default function ApexFaqSchema() {`,
    `  return (`,
    `    <script`,
    `      type="application/ld+json"`,
    `      // eslint-disable-next-line react/no-danger`,
    `      dangerouslySetInnerHTML={{ __html: ${JSON.stringify(json)} }}`,
    `    />`,
    `  );`,
    `}`,
    APEX_END_TS,
    "",
  ].join("\n");
}

function nextPagesComponent(jsonLd: object): string {
  return nextAppComponent(jsonLd); // identical body; different import path is documented in notes
}

function astroComponent(jsonLd: object): string {
  const json = escapeForScript(JSON.stringify(jsonLd, null, 2));
  return [
    `---`,
    `// >>> apex:faq-schema — managed block — do not edit between markers`,
    `// Generated by apex fix faq-schema.`,
    `// Usage: <ApexFaqSchema /> in your layout or page frontmatter import.`,
    `// <<< apex:faq-schema`,
    `---`,
    `<script type="application/ld+json" set:html={\`${json.replace(/`/g, "\\`")}\`} />`,
    "",
  ].join("\n");
}

async function detectNextRouter(rootDir: string): Promise<"app" | "pages" | "unknown"> {
  if ((await readIfExists(path.join(rootDir, "app/layout.tsx"))) !== null) return "app";
  if ((await readIfExists(path.join(rootDir, "app/layout.jsx"))) !== null) return "app";
  if ((await readIfExists(path.join(rootDir, "src/app/layout.tsx"))) !== null) return "app";
  if ((await readIfExists(path.join(rootDir, "pages/_app.tsx"))) !== null) return "pages";
  if ((await readIfExists(path.join(rootDir, "pages/_app.jsx"))) !== null) return "pages";
  return "unknown";
}

const fixer: Fixer = {
  id: "faq-schema",
  title: "FAQPage JSON-LD",
  description:
    "Generates a schema.org FAQPage JSON-LD snippet from apex.faq.json and emits a framework-appropriate include. " +
    "FAQ schema is one of the highest-yield AAIV fixes — LLMs lift Q&A pairs verbatim into answers.",
  appliesTo: "all",

  async apply(ctx: FixerContext): Promise<FixerResult> {
    const changes: ChangeRecord[] = [];
    const notes: string[] = [];

    const found = await findFaqSource(ctx.rootDir);

    if (!found) {
      const rel = "apex.faq.json";
      const content = JSON.stringify(SCAFFOLD_FAQ, null, 2) + "\n";
      changes.push(await writeFile(ctx.rootDir, rel, content, ctx.dryRun));
      notes.push("Scaffolded apex.faq.json with example entries. Edit it with your real Q&A and rerun: apex fix faq-schema");
      return {
        ok: true,
        summary: `No FAQ source found — scaffolded ${rel}. Fill it in and rerun.`,
        changes,
        notes,
      };
    }

    let parsed: FaqFile;
    try {
      parsed = parseFaq(found.path, found.raw);
    } catch (e: any) {
      return { ok: false, summary: `Failed to parse ${found.path}: ${e?.message ?? e}`, changes, notes };
    }

    const v = validate(parsed);
    if (!v.ok) {
      notes.push(...v.errors.map((e) => `validation: ${e}`));
      return { ok: false, summary: `FAQ validation failed (${v.errors.length} issues). See notes.`, changes, notes };
    }

    const jsonLd = buildJsonLd(parsed);

    let outRel: string;
    let outContent: string;

    switch (ctx.framework) {
      case "nextjs": {
        const router = await detectNextRouter(ctx.rootDir);
        if (router === "pages") {
          outRel = "pages/_apex-faq-schema.tsx";
          outContent = nextPagesComponent(jsonLd);
          notes.push("Pages router: import this component in pages/_app.tsx and render it inside <Head> as a child of any page that should expose FAQ schema.");
        } else {
          outRel = "app/_apex/faq-schema.tsx";
          outContent = nextAppComponent(jsonLd);
          notes.push("App router: import from your page or layout, e.g. import ApexFaqSchema from \"./_apex/faq-schema\"; then render <ApexFaqSchema />.");
        }
        break;
      }
      case "astro": {
        outRel = "src/components/ApexFaqSchema.astro";
        outContent = astroComponent(jsonLd);
        notes.push("Astro: import { default as ApexFaqSchema } from '../components/ApexFaqSchema.astro' in your layout, then render <ApexFaqSchema />.");
        break;
      }
      case "wordpress": {
        outRel = "apex-faq-schema.html";
        outContent = htmlSnippet(jsonLd);
        notes.push("WordPress: paste the contents of apex-faq-schema.html into a header/footer snippet plugin (e.g. WPCode, Insert Headers and Footers) so it renders inside <head> on the FAQ page.");
        break;
      }
      case "static-html": {
        outRel = "partials/apex-faq-schema.html";
        outContent = htmlSnippet(jsonLd);
        notes.push("Static HTML: include partials/apex-faq-schema.html inside the <head> of the FAQ page (e.g. via your build tool's include directive).");
        break;
      }
      default: {
        outRel = "apex-faq-schema.json";
        outContent = JSON.stringify(jsonLd, null, 2) + "\n";
        notes.push("Framework not detected. Wrap the JSON in a <script type=\"application/ld+json\"> tag and place it inside <head>.");
      }
    }

    changes.push(await writeFile(ctx.rootDir, outRel, outContent, ctx.dryRun));
    notes.push("Validate at https://validator.schema.org/ after deploy.");
    notes.push("Rich Results test: https://search.google.com/test/rich-results");

    return {
      ok: true,
      summary: `${ctx.framework}: wrote ${parsed.entries.length}-entry FAQPage to ${outRel}`,
      changes,
      notes,
    };
  },
};

export default fixer;
export const apply = fixer.apply.bind(fixer);
