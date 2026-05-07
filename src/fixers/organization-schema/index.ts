// Apex fixer: Organization JSON-LD.
//
// Organization schema is the single biggest "Are you understood?" lever.
// LLMs use it to anchor brand → category → URL → social → contact.
//
// Strategy:
//   1. Read apex.org.json from repo root (preferred). Fall back to org.json,
//      data/org.json. If none exist, scaffold apex.org.json and stop.
//   2. Validate required fields: name, url, description.
//   3. Build a schema.org Organization (or sub-type) object with:
//        @type, name, alternateName, url, logo, sameAs (socials),
//        description, foundingDate, contactPoint, address, areaServed.
//   4. Emit a framework-appropriate include — same routing logic as faq-schema.
//   5. Idempotent via apex managed-block markers.

import path from "node:path";
import type { Fixer, FixerContext, FixerResult, ChangeRecord } from "../_contract.js";
import { writeFile, readIfExists } from "../_contract.js";

const APEX_START_HTML = "<!-- >>> apex:organization-schema — managed block — do not edit between markers -->";
const APEX_END_HTML   = "<!-- <<< apex:organization-schema -->";
const APEX_START_TS   = "// >>> apex:organization-schema — managed block — do not edit between markers";
const APEX_END_TS     = "// <<< apex:organization-schema";

type OrgType =
  | "Organization"
  | "Corporation"
  | "LocalBusiness"
  | "OnlineBusiness"
  | "EducationalOrganization"
  | "GovernmentOrganization"
  | "NGO";

interface ContactPoint {
  contactType: string;
  email?: string;
  telephone?: string;
  areaServed?: string | string[];
  availableLanguage?: string | string[];
}

interface PostalAddress {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

interface OrgFile {
  type?: OrgType;
  name: string;
  alternateName?: string[];
  url: string;
  logo?: string;
  description: string;
  foundingDate?: string;
  sameAs?: string[];
  contactPoint?: ContactPoint[];
  address?: PostalAddress;
  areaServed?: string | string[];
  knowsAbout?: string[];
  slogan?: string;
}

const SCAFFOLD_ORG: OrgFile = {
  type: "Organization",
  name: "Replace With Your Brand",
  alternateName: ["Common short name", "Legal name if different"],
  url: "https://example.com",
  logo: "https://example.com/logo.png",
  description:
    "One-paragraph plain-language description. Lead with what you do in literal terms, then who it's for. Keep under 60 words. This text frequently appears verbatim in LLM answers.",
  foundingDate: "2024",
  sameAs: [
    "https://www.linkedin.com/company/your-company",
    "https://twitter.com/your-handle",
    "https://github.com/your-org",
  ],
  contactPoint: [
    {
      contactType: "customer support",
      email: "support@example.com",
      availableLanguage: ["en"],
    },
  ],
  knowsAbout: ["primary topic", "secondary topic"],
};

async function findOrgSource(rootDir: string): Promise<{ path: string; raw: string } | null> {
  const candidates = ["apex.org.json", "org.json", "data/org.json"];
  for (const rel of candidates) {
    const abs = path.join(rootDir, rel);
    const raw = await readIfExists(abs);
    if (raw !== null) return { path: rel, raw };
  }
  return null;
}

function validate(org: OrgFile): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!org.name?.trim()) errors.push("name is required");
  if (!org.url?.trim()) errors.push("url is required");
  if (!org.description?.trim()) errors.push("description is required");

  if (org.url && !/^https?:\/\//.test(org.url)) errors.push("url must be absolute (https://...)");
  if (org.logo && !/^https?:\/\//.test(org.logo)) warnings.push("logo should be an absolute URL");

  if (org.description && /replace with/i.test(org.description)) warnings.push("description still contains scaffold text");
  if (org.name && /replace with/i.test(org.name)) errors.push("name is still the scaffold placeholder");

  if (!org.sameAs?.length) warnings.push("sameAs is empty — add LinkedIn, X, GitHub, Crunchbase, Wikidata for stronger entity grounding");
  if (!org.logo) warnings.push("logo is recommended (absolute URL)");
  if (!org.foundingDate) warnings.push("foundingDate helps disambiguate from same-named entities");

  org.contactPoint?.forEach((c, i) => {
    if (!c.contactType?.trim()) errors.push(`contactPoint[${i}].contactType is required`);
    if (!c.email && !c.telephone) errors.push(`contactPoint[${i}] needs at least email or telephone`);
  });

  return { ok: errors.length === 0, errors, warnings };
}

function buildJsonLd(org: OrgFile): object {
  const obj: any = {
    "@context": "https://schema.org",
    "@type": org.type ?? "Organization",
    name: org.name,
    url: org.url,
    description: org.description,
  };
  if (org.alternateName?.length) obj.alternateName = org.alternateName;
  if (org.logo) obj.logo = org.logo;
  if (org.slogan) obj.slogan = org.slogan;
  if (org.foundingDate) obj.foundingDate = org.foundingDate;
  if (org.sameAs?.length) obj.sameAs = org.sameAs;
  if (org.knowsAbout?.length) obj.knowsAbout = org.knowsAbout;
  if (org.areaServed) obj.areaServed = org.areaServed;

  if (org.contactPoint?.length) {
    obj.contactPoint = org.contactPoint.map((c) => {
      const cp: any = { "@type": "ContactPoint", contactType: c.contactType };
      if (c.email) cp.email = c.email;
      if (c.telephone) cp.telephone = c.telephone;
      if (c.areaServed) cp.areaServed = c.areaServed;
      if (c.availableLanguage) cp.availableLanguage = c.availableLanguage;
      return cp;
    });
  }

  if (org.address) {
    obj.address = { "@type": "PostalAddress", ...org.address };
  }

  return obj;
}

function escapeForScript(json: string): string {
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
    `// Generated by apex fix organization-schema.`,
    `// Import once in app/layout.tsx and render inside the <body>:`,
    `//   import ApexOrganizationSchema from "./_apex/organization-schema";`,
    `//   <ApexOrganizationSchema />`,
    `export default function ApexOrganizationSchema() {`,
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
  return nextAppComponent(jsonLd);
}

function astroComponent(jsonLd: object): string {
  const json = escapeForScript(JSON.stringify(jsonLd, null, 2));
  return [
    `---`,
    `// >>> apex:organization-schema — managed block — do not edit between markers`,
    `// Generated by apex fix organization-schema.`,
    `// Usage: render <ApexOrganizationSchema /> once in your root layout.`,
    `// <<< apex:organization-schema`,
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
  id: "organization-schema",
  title: "Organization JSON-LD",
  description:
    "Generates a schema.org Organization JSON-LD snippet from apex.org.json. " +
    "Anchors your brand entity for LLMs — name, aliases, URL, logo, socials, contact, knowsAbout topics.",
  appliesTo: "all",

  async apply(ctx: FixerContext): Promise<FixerResult> {
    const changes: ChangeRecord[] = [];
    const notes: string[] = [];

    const found = await findOrgSource(ctx.rootDir);

    if (!found) {
      const rel = "apex.org.json";
      const content = JSON.stringify(SCAFFOLD_ORG, null, 2) + "\n";
      changes.push(await writeFile(ctx.rootDir, rel, content, ctx.dryRun));
      notes.push("Scaffolded apex.org.json. Replace placeholder values with your real org details and rerun: apex fix organization-schema");
      notes.push("Tip: keep the description here in sync with your Radar AIV brand description for consistent perception across engines.");
      return {
        ok: true,
        summary: `No org source found — scaffolded ${rel}. Fill it in and rerun.`,
        changes,
        notes,
      };
    }

    let parsed: OrgFile;
    try {
      parsed = JSON.parse(found.raw) as OrgFile;
    } catch (e: any) {
      return { ok: false, summary: `Failed to parse ${found.path}: ${e?.message ?? e}`, changes, notes };
    }

    const v = validate(parsed);
    notes.push(...v.warnings.map((w) => `warning: ${w}`));
    if (!v.ok) {
      notes.push(...v.errors.map((e) => `error: ${e}`));
      return { ok: false, summary: `Org validation failed (${v.errors.length} errors).`, changes, notes };
    }

    const jsonLd = buildJsonLd(parsed);

    let outRel: string;
    let outContent: string;

    switch (ctx.framework) {
      case "nextjs": {
        const router = await detectNextRouter(ctx.rootDir);
        if (router === "pages") {
          outRel = "pages/_apex-organization-schema.tsx";
          outContent = nextPagesComponent(jsonLd);
          notes.push("Pages router: import in pages/_app.tsx and render inside <Head> so it ships on every page.");
        } else {
          outRel = "app/_apex/organization-schema.tsx";
          outContent = nextAppComponent(jsonLd);
          notes.push("App router: import from app/layout.tsx and render once inside <body> so it ships on every page.");
        }
        break;
      }
      case "astro": {
        outRel = "src/components/ApexOrganizationSchema.astro";
        outContent = astroComponent(jsonLd);
        notes.push("Astro: import in your root layout (e.g. src/layouts/Layout.astro) and render <ApexOrganizationSchema /> once.");
        break;
      }
      case "wordpress": {
        outRel = "apex-organization-schema.html";
        outContent = htmlSnippet(jsonLd);
        notes.push("WordPress: paste apex-organization-schema.html into a site-wide header snippet (WPCode, Insert Headers and Footers, etc.) so it renders on every page.");
        break;
      }
      case "static-html": {
        outRel = "partials/apex-organization-schema.html";
        outContent = htmlSnippet(jsonLd);
        notes.push("Static HTML: include partials/apex-organization-schema.html inside <head> on every page (use your build tool's include directive).");
        break;
      }
      default: {
        outRel = "apex-organization-schema.json";
        outContent = JSON.stringify(jsonLd, null, 2) + "\n";
        notes.push("Framework not detected. Wrap the JSON in <script type=\"application/ld+json\"> and place it inside <head> on every page.");
      }
    }

    changes.push(await writeFile(ctx.rootDir, outRel, outContent, ctx.dryRun));
    notes.push("Validate at https://validator.schema.org/ after deploy.");
    notes.push("Keep apex.org.json in version control so the entity stays consistent across deploys.");
    notes.push("Mirror the description, alternateName, and sameAs values into your Radar AIV brand config for consistent perception.");

    return {
      ok: true,
      summary: `${ctx.framework}: wrote Organization schema (${parsed.name}) to ${outRel}`,
      changes,
      notes,
    };
  },
};

export default fixer;
export const apply = fixer.apply.bind(fixer);
