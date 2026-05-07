import { parseFlags, emit } from "./_flags.js";
import { detectFramework } from "../core/framework/detect.js";

const FIXERS: Record<string, () => Promise<{ apply: (ctx: any) => Promise<any> }>> = {
  "ai-crawler-access":  () => import("../fixers/ai-crawler-access/index.js"),
  "faq-schema":         () => import("../fixers/faq-schema/index.js"),
  "organization-schema":() => import("../fixers/organization-schema/index.js"),
};

export async function run(argv: string[]): Promise<number> {
  const f = parseFlags(argv);
  if (f.help || f.positional.length === 0) {
    console.log(
      "apex fix <fixer-id> [options]\n\n" +
      "Available fixers:\n" +
      Object.keys(FIXERS).map((k) => "  - " + k).join("\n") + "\n\n" +
      "Common options:\n" +
      "  --dry-run     print planned changes, write nothing\n" +
      "  --root <dir>  project root (default: cwd)",
    );
    return f.help ? 0 : 2;
  }
  const id = f.positional[0];
  const loader = FIXERS[id];
  if (!loader) { console.error(`Unknown fixer: ${id}`); return 2; }

  const root = (f.options.root as string) || process.cwd();
  const detection = await detectFramework(root);
  const dryRun = Boolean(f.options["dry-run"]);

  const mod = await loader();
  const result = await mod.apply({
    rootDir: root,
    framework: detection.framework,
    dryRun,
    options: f.options,
  });

  emit(f.json, { fixer: id, framework: detection.framework, dryRun, result }, () => {
    const lines = [`apex fix: ${id}  (framework: ${detection.framework}${dryRun ? ", dry-run" : ""})`];
    if (result?.summary) lines.push(result.summary);
    if (result?.changes?.length) {
      lines.push("Changes:");
      for (const c of result.changes) lines.push(`  ${c.action}  ${c.path}`);
    }
    if (result?.notes?.length) {
      lines.push("Notes:");
      for (const n of result.notes) lines.push(`  • ${n}`);
    }
    return lines.join("\n");
  });
  return result?.ok === false ? 1 : 0;
}
