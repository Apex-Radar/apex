// BYOK key manager. Order: explicit arg → keychain (keytar, optional) → env var.
// Apex never proxies LLM calls; users pay providers directly.

export type ProviderId =
  | "openai"
  | "anthropic"
  | "perplexity"
  | "gemini"
  | "grok"
  | "deepseek"
  | "firecrawl";

const ENV_MAP: Record<ProviderId, string> = {
  openai: "APEX_OPENAI_API_KEY",
  anthropic: "APEX_ANTHROPIC_API_KEY",
  perplexity: "APEX_PERPLEXITY_API_KEY",
  gemini: "APEX_GEMINI_API_KEY",
  grok: "APEX_GROK_API_KEY",
  deepseek: "APEX_DEEPSEEK_API_KEY",
  firecrawl: "APEX_FIRECRAWL_API_KEY",
};

const SERVICE = "apex-skill";

let keytarCache: any | null | undefined = undefined;
async function loadKeytar(): Promise<any | null> {
  if (keytarCache !== undefined) return keytarCache;
  try {
    keytarCache = await import("keytar");
  } catch {
    keytarCache = null;
  }
  return keytarCache;
}

export class KeyManager {
  async get(provider: ProviderId): Promise<string | null> {
    const envName = ENV_MAP[provider];
    const fromEnv = process.env[envName];
    if (fromEnv) return fromEnv;

    const keytar = await loadKeytar();
    if (keytar?.getPassword) {
      try {
        const v = await keytar.getPassword(SERVICE, provider);
        if (v) return v;
      } catch {
        /* keychain unavailable; fall through */
      }
    }
    return null;
  }

  async set(provider: ProviderId, value: string): Promise<"keychain" | "env-instructions"> {
    const keytar = await loadKeytar();
    if (keytar?.setPassword) {
      await keytar.setPassword(SERVICE, provider, value);
      return "keychain";
    }
    return "env-instructions";
  }

  async remove(provider: ProviderId): Promise<boolean> {
    const keytar = await loadKeytar();
    if (keytar?.deletePassword) {
      try {
        return await keytar.deletePassword(SERVICE, provider);
      } catch {
        return false;
      }
    }
    return false;
  }

  envVarName(provider: ProviderId): string {
    return ENV_MAP[provider];
  }

  async list(): Promise<Array<{ provider: ProviderId; source: "env" | "keychain" | "missing" }>> {
    const out: Array<{ provider: ProviderId; source: "env" | "keychain" | "missing" }> = [];
    const keytar = await loadKeytar();
    for (const p of Object.keys(ENV_MAP) as ProviderId[]) {
      if (process.env[ENV_MAP[p]]) {
        out.push({ provider: p, source: "env" });
        continue;
      }
      if (keytar?.getPassword) {
        try {
          const v = await keytar.getPassword(SERVICE, p);
          if (v) {
            out.push({ provider: p, source: "keychain" });
            continue;
          }
        } catch {
          /* ignore */
        }
      }
      out.push({ provider: p, source: "missing" });
    }
    return out;
  }
}

export const keys = new KeyManager();
