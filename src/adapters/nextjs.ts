// Next.js adapter — programmatic helpers for users who want to wire Apex
// into their own build/deploy pipeline (instead of the CLI).
//
// The fixers already encode all framework-specific writing. This adapter
// just exposes typed wrappers so a user's next.config.js or a build script
// can call them.

import type { FixerResult } from "../fixers/_contract.js";
import faqFixer from "../fixers/faq-schema/index.js";
import orgFixer from "../fixers/organization-schema/index.js";
import crawlerFixer from "../fixers/ai-crawler-access/index.js";

export interface NextAdapterOptions {
  rootDir?: string;
  dryRun?: boolean;
}

function ctx(opts: NextAdapterOptions) {
  return {
    rootDir: opts.rootDir ?? process.cwd(),
    framework: "nextjs" as const,
    dryRun: opts.dryRun ?? false,
    options: {} as Record<string, string | boolean>,
  };
}

export const nextjs = {
  applyFaqSchema: (opts: NextAdapterOptions = {}): Promise<FixerResult> => faqFixer.apply(ctx(opts)),
  applyOrganizationSchema: (opts: NextAdapterOptions = {}): Promise<FixerResult> => orgFixer.apply(ctx(opts)),
  applyAiCrawlerAccess: (opts: NextAdapterOptions = {}): Promise<FixerResult> => crawlerFixer.apply(ctx(opts)),
};
