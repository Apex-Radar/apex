import type { FixerResult } from "../fixers/_contract.js";
import faqFixer from "../fixers/faq-schema/index.js";
import orgFixer from "../fixers/organization-schema/index.js";
import crawlerFixer from "../fixers/ai-crawler-access/index.js";

export interface StaticHtmlAdapterOptions {
  rootDir?: string;
  dryRun?: boolean;
}

function ctx(opts: StaticHtmlAdapterOptions) {
  return {
    rootDir: opts.rootDir ?? process.cwd(),
    framework: "static-html" as const,
    dryRun: opts.dryRun ?? false,
    options: {} as Record<string, string | boolean>,
  };
}

export const staticHtml = {
  applyFaqSchema: (opts: StaticHtmlAdapterOptions = {}): Promise<FixerResult> => faqFixer.apply(ctx(opts)),
  applyOrganizationSchema: (opts: StaticHtmlAdapterOptions = {}): Promise<FixerResult> => orgFixer.apply(ctx(opts)),
  applyAiCrawlerAccess: (opts: StaticHtmlAdapterOptions = {}): Promise<FixerResult> => crawlerFixer.apply(ctx(opts)),
};
