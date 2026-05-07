import { parseFlags, emit } from "./_flags.js";
import { keys, type ProviderId } from "../core/keys/manager.js";

const PROVIDERS: ProviderId[] = [
  "openai", "anthropic", "perplexity", "gemini", "grok", "deepseek", "firecrawl", "radar_portal",
];

export async function run(argv: string[]): Promise<number> {
  const f = parseFlags(argv);
  const sub = f.positional[0];
  if (f.help || !sub) {
    console.log(
      "apex keys <list|set|remove> [provider] [value]\n\n" +
      "Providers: " + PROVIDERS.join(", ") + "\n\n" +
      "BYOK: keys live in your OS keychain (preferred) or env vars.\n" +
      "Apex never transmits keys to Apex Radar — they go straight to the provider.",
    );
    return f.help ? 0 : 2;
  }

  if (sub === "list") {
    const rows = await keys.list();
    emit(f.json, rows, () => rows.map((r) => `  ${r.provider.padEnd(14)} ${r.source}`).join("\n"));
    return 0;
  }

  const provider = f.positional[1] as ProviderId;
  if (!provider || !PROVIDERS.includes(provider)) {
    console.error(`Unknown provider: ${provider}\nKnown: ${PROVIDERS.join(", ")}`);
    return 2;
  }

  if (sub === "set") {
    const value = f.positional[2];
    if (!value) { console.error("Missing value. Usage: apex keys set <provider> <value>"); return 2; }
    const where = await keys.set(provider, value);
    if (where === "keychain") {
      console.log(`Stored ${provider} in OS keychain.`);
    } else {
      console.log(`Keychain unavailable. Add to your shell profile:\n  export ${keys.envVarName(provider)}=${value}`);
    }
    return 0;
  }

  if (sub === "remove") {
    const ok = await keys.remove(provider);
    console.log(ok ? `Removed ${provider} from keychain.` : `Nothing to remove (or env-only).`);
    return 0;
  }

  console.error(`Unknown subcommand: ${sub}`);
  return 2;
}
