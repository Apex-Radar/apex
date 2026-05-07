import type { FixerResult } from "../fixers/_contract.js";
import faqFixer from "../fixers/faq-schema/index.js";
import orgFixer from "../fixers/organization-schema/index.js";
import crawlerFixer from "../fixers/ai-crawler-access/index.js";

export interface AstroAdapterOptions {
  rootDir?: string;
  dryRun?: boolean;
}

function ctx(opts: AstroAdapterOptions) {
  return {
    rootDir: opts.rootDir ?? process.cwd(),
    framework: "astro" as const,
    dryRun: opts.dryRun ?? false,
    options: {} as Record<string, string | boolean>,
  };
}

export const astro = {
  applyFaqSchema: (opts: AstroAdapterOptions = {}): Promise<FixerResult> => faqFixer.apply(ctx(opts)),
  applyOrganizationSchema: (opts: AstroAdapterOptions = {}): Promise<FixerResult> => orgFixer.apply(ctx(opts)),
  applyAiCrawlerAccess: (opts: AstroAdapterOptions = {}): Promise<FixerResult> => crawlerFixer.apply(ctx(opts)),
};
