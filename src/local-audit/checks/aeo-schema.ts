/**
 * AEO schema checks — parity-faithful port of `apex-worker-do/src/checks/aeo-checks.js`
 * lines 199-383 (all 14 schema checks).
 */
import * as cheerio from "cheerio";
import type { AuditCheck } from "../../radar/types.js";
import type { LocalCheckRunner } from "../types.js";

interface JsonLdBlock {
  [k: string]: any;
  "@type"?: string | string[];
  "@graph"?: any[];
}

function parseJsonLdBlocks(
  $: cheerio.CheerioAPI,
): { blocks: JsonLdBlock[]; types: string[] } {
  const blocks: JsonLdBlock[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      blocks.push(data);
      if (Array.isArray(data["@graph"]))
        data["@graph"].forEach((item: any) => blocks.push(item));
    } catch {
      // bad JSON-LD — skipped
    }
  });
  const types = blocks
    .map((b) => b["@type"])
    .filter(Boolean)
    .flat() as string[];
  return { blocks, types };
}

function hasType(types: string[], t: string): boolean {
  return types.some((x) =>
    (Array.isArray(x) ? x : [x]).some((tt) => String(tt).toLowerCase() === t.toLowerCase()),
  );
}

export const aeoSchemaChecks: LocalCheckRunner = (ctx) => {
  const checks: AuditCheck[] = [];
  const page = ctx.pages[0];
  if (!page || !page.html) return checks;

  const $ = cheerio.load(page.html);
  const { blocks, types } = parseJsonLdBlocks($);

  // Organization Schema (includes subtypes)
  const orgTypes = [
    "Organization", "LocalBusiness", "ProfessionalService", "Corporation",
    "EducationalOrganization", "NGO", "GovernmentOrganization", "PerformingGroup",
    "SportsOrganization", "Store", "Restaurant", "Hotel", "MedicalOrganization",
    "NewsMediaOrganization", "Dentist", "LegalService", "FinancialService",
    "HomeAndConstructionBusiness", "AutoDealer", "Plumber", "Electrician",
    "BeautySalon", "HairSalon", "GeneralContractor", "HVACBusiness",
    "RoofingContractor", "Physician", "RealEstateAgent", "AccountingService",
    "InsuranceAgency", "TravelAgency", "ChildCare",
  ];
  if (orgTypes.some((t) => hasType(types, t))) {
    checks.push({ id: "organization-schema", title: "Organization Schema", category: "AEO", status: "pass", message: "Organization-type schema found.", impact: 5 });
  } else {
    checks.push({ id: "organization-schema", title: "Organization Schema", category: "AEO", status: "fail", message: "No Organization schema.", impact: 5 });
  }

  // LocalBusiness Schema
  const localTypes = [
    "LocalBusiness", "ProfessionalService", "Store", "Restaurant", "Hotel",
    "Dentist", "LegalService", "Plumber", "Electrician", "BeautySalon", "HairSalon",
    "GeneralContractor", "HVACBusiness", "RoofingContractor", "Physician",
    "RealEstateAgent", "AccountingService", "InsuranceAgency", "TravelAgency",
  ];
  if (localTypes.some((t) => hasType(types, t))) {
    checks.push({ id: "localbusiness-schema", title: "LocalBusiness Schema", category: "AEO", status: "pass", message: "LocalBusiness-type schema found." });
  } else {
    checks.push({ id: "localbusiness-schema", title: "LocalBusiness Schema", category: "AEO", status: "warn", message: "No LocalBusiness schema." });
  }

  // FAQ Schema
  if (hasType(types, "FAQPage")) {
    checks.push({ id: "faq-schema", title: "FAQ Schema", category: "AEO", status: "pass", message: "FAQPage schema found.", impact: 5 });
  } else {
    checks.push({ id: "faq-schema", title: "FAQ Schema", category: "AEO", status: "fail", message: "No FAQPage schema. #1 AEO markup.", impact: 5 });
  }

  // FAQ Schema Visible — only emitted when FAQPage exists
  if (hasType(types, "FAQPage")) {
    const faqBlock = blocks.find((b) => {
      const t = Array.isArray(b["@type"]) ? b["@type"] : [b["@type"]];
      return t.includes("FAQPage");
    });
    const questions: string[] = ((faqBlock?.mainEntity as any[]) || [])
      .map((q) => (q.name || "").trim())
      .filter(Boolean);
    if (questions.length === 0) {
      checks.push({ id: "faq-schema-visible", title: "FAQ Schema Visible", category: "AEO", status: "warn", message: "FAQPage schema has no questions listed.", impact: 5 });
    } else {
      const visibleBody = $("body").text().toLowerCase();
      const matched = questions.filter((q) => visibleBody.includes(q.toLowerCase().slice(0, 30))).length;
      if (matched === questions.length) {
        checks.push({ id: "faq-schema-visible", title: "FAQ Schema Visible", category: "AEO", status: "pass", message: `All ${questions.length} FAQ questions appear in rendered HTML.`, impact: 5 });
      } else if (matched > 0) {
        checks.push({ id: "faq-schema-visible", title: "FAQ Schema Visible", category: "AEO", status: "warn", message: `${matched} of ${questions.length} FAQ questions found in body. Google penalizes orphan FAQ schema.`, impact: 5 });
      } else {
        checks.push({ id: "faq-schema-visible", title: "FAQ Schema Visible", category: "AEO", status: "fail", message: "No FAQ questions visible in body. Orphan schema — Google will ignore or penalize.", impact: 5 });
      }
    }
  }

  // HowTo Schema
  if (hasType(types, "HowTo")) {
    checks.push({ id: "howto-schema", title: "HowTo Schema", category: "AEO", status: "pass", message: "HowTo schema found.", impact: 1 });
  } else {
    checks.push({ id: "howto-schema", title: "HowTo Schema", category: "AEO", status: "warn", message: "No HowTo schema.", impact: 1 });
  }

  // Article Schema
  if (hasType(types, "Article") || hasType(types, "BlogPosting") || hasType(types, "NewsArticle")) {
    checks.push({ id: "article-schema", title: "Article Schema", category: "AEO", status: "pass", message: "Article schema found.", impact: 1 });
  } else {
    checks.push({ id: "article-schema", title: "Article Schema", category: "AEO", status: "warn", message: "No Article schema.", impact: 1 });
  }

  // Breadcrumb Schema
  if (hasType(types, "BreadcrumbList")) {
    checks.push({ id: "breadcrumb-schema", title: "Breadcrumb Schema", category: "AEO", status: "pass", message: "BreadcrumbList found.", impact: 1 });
  } else {
    checks.push({ id: "breadcrumb-schema", title: "Breadcrumb Schema", category: "AEO", status: "warn", message: "No BreadcrumbList schema.", impact: 1 });
  }

  // Review Schema
  if (hasType(types, "Review") || hasType(types, "AggregateRating")) {
    checks.push({ id: "review-schema", title: "Review Schema", category: "AEO", status: "pass", message: "Review schema found." });
  } else {
    checks.push({ id: "review-schema", title: "Review Schema", category: "AEO", status: "warn", message: "No review schema." });
  }

  // Service/Product Schema (also checks nested offerings)
  const hasNestedOffers = blocks.some((b) =>
    b.hasOfferCatalog || b.makesOffer || b.offers || (b.itemListElement && Array.isArray(b.itemListElement)),
  );
  if (hasType(types, "Service") || hasType(types, "Product") || hasType(types, "Offer") || hasNestedOffers) {
    checks.push({ id: "service-product-schema", title: "Service/Product Schema", category: "AEO", status: "pass", message: "Service/Product offerings found.", impact: 5 });
  } else {
    checks.push({ id: "service-product-schema", title: "Service/Product Schema", category: "AEO", status: "warn", message: "No Service/Product schema.", impact: 5 });
  }

  // ContactPoint Schema
  if (blocks.some((b) => b.contactPoint || b["@type"] === "ContactPoint")) {
    checks.push({ id: "contactpoint-schema", title: "ContactPoint Schema", category: "AEO", status: "pass", message: "ContactPoint found.", impact: 1 });
  } else {
    checks.push({ id: "contactpoint-schema", title: "ContactPoint Schema", category: "AEO", status: "warn", message: "No ContactPoint schema.", impact: 1 });
  }

  // SameAs Entity Links
  if (blocks.some((b) => Array.isArray(b.sameAs) && b.sameAs.length > 0)) {
    checks.push({ id: "sameas-entity-links", title: "SameAs Entity Links", category: "AEO", status: "pass", message: "SameAs links found." });
  } else {
    checks.push({ id: "sameas-entity-links", title: "SameAs Entity Links", category: "AEO", status: "warn", message: "No sameAs links." });
  }

  // Author / Person Schema
  const hasPersonSchema = blocks.some((b) => {
    const t = Array.isArray(b["@type"]) ? b["@type"] : [b["@type"]];
    return t.filter(Boolean).some((x: any) => String(x).toLowerCase() === "person");
  });
  const hasAuthorField = blocks.some((b) => b.author || b.creator || b.founder || b.employee || b.contributor);
  const authorNames: string[] = [];
  for (const b of blocks) {
    const a = b.author || b.creator || b.founder;
    if (!a) continue;
    const arr = Array.isArray(a) ? a : [a];
    for (const x of arr) {
      if (typeof x === "string") authorNames.push(x);
      else if (x?.name) authorNames.push(x.name);
    }
  }
  if (hasPersonSchema || hasAuthorField) {
    const names = [...new Set(authorNames)].slice(0, 3).join(", ");
    checks.push({ id: "author-person-schema", title: "Author / Person Schema", category: "AEO", status: "pass", message: names ? `Identified: ${names}. E-E-A-T signal present.` : "Author/Person schema found." });
  } else {
    checks.push({ id: "author-person-schema", title: "Author / Person Schema", category: "AEO", status: "warn", message: "No author, creator, or Person schema. E-E-A-T signal missing — LLMs and Google weight anonymous content less." });
  }

  // Schema Completeness
  const schemaFieldCount = blocks.reduce((a, b) => a + Object.keys(b).length, 0);
  if (schemaFieldCount > 20) {
    checks.push({ id: "schema-completeness", title: "Schema Completeness", category: "AEO", status: "pass", message: `${schemaFieldCount} schema fields.` });
  } else if (schemaFieldCount > 5) {
    checks.push({ id: "schema-completeness", title: "Schema Completeness", category: "AEO", status: "warn", message: `Only ${schemaFieldCount} fields.` });
  } else {
    checks.push({ id: "schema-completeness", title: "Schema Completeness", category: "AEO", status: "fail", message: "Schema minimal or absent." });
  }

  // Schema Validity
  if (blocks.length > 0) {
    checks.push({ id: "schema-validity", title: "Schema Validity", category: "AEO", status: "pass", message: "JSON-LD parsed without errors.", impact: 5 });
  } else {
    checks.push({ id: "schema-validity", title: "Schema Validity", category: "AEO", status: "fail", message: "No schema to validate.", impact: 5 });
  }

  return checks;
};
