// WordPress adapter — emits HTML snippets ready to paste into a header/footer
// snippet plugin (WPCode, Insert Headers and Footers, etc.). It does not
// touch the WordPress filesystem.

import type { FixerResult } from "../fixers/_contract.js";
import faqFixer from "../fixers/faq-schema/index.js";
import orgFixer from "../fixers/organization-schema/index.js";
import crawlerFixer from "../fixers/ai-crawler-access/index.js";

export interface WordpressAdapterOptions {
  rootDir?: string;
  dryRun?: boolean;
}

function ctx(opts: WordpressAdapterOptions) {
  return {
    rootDir: opts.rootDir ?? process.cwd(),
    framework: "wordpress" as const,
    dryRun: opts.dryRun ?? false,
    options: {} as Record<string, string | boolean>,
  };
}

export const wordpress = {
  applyFaqSchema: (opts: WordpressAdapterOptions = {}): Promise<FixerResult> => faqFixer.apply(ctx(opts)),
  applyOrganizationSchema: (opts: WordpressAdapterOptions = {}): Promise<FixerResult> => orgFixer.apply(ctx(opts)),
  applyAiCrawlerAccess: (opts: WordpressAdapterOptions = {}): Promise<FixerResult> => crawlerFixer.apply(ctx(opts)),
};
