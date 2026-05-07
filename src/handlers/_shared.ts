// Tiny flag parser shared by all handlers. No deps.

export interface ParsedFlags {
  json: boolean;
  help: boolean;
  positional: string[];
  options: Record<string, string | boolean>;
}

export function parseFlags(argv: string[]): ParsedFlags {
  const out: ParsedFlags = { json: false, help: false, positional: [], options: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") { out.json = true; continue; }
    if (a === "--help" || a === "-h") { out.help = true; continue; }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) {
        out.options[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith("--")) {
          out.options[a.slice(2)] = next;
          i++;
        } else {
          out.options[a.slice(2)] = true;
        }
      }
      continue;
    }
    out.positional.push(a);
  }
  return out;
}

export function emit(json: boolean, data: unknown, pretty: () => string): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(pretty());
  }
}

export async function requireToken(keysMod: { get(p: any): Promise<string | null> }): Promise<string> {
  const t = await keysMod.get("radar_portal");
  if (!t) {
    throw new Error(
      "Radar portal token not found. Set APEX_RADAR_PORTAL_TOKEN or run: apex keys set radar_portal",
    );
  }
  return t;
}

export const RADAR_BASE = process.env.APEX_RADAR_BASE_URL || "https://app.getapexradar.com";
