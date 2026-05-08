// Tiny flag parser shared by all handlers. No deps.

export interface ParsedFlags {
  json: boolean;
  help: boolean;
  positional: string[];
  options: Record<string, string | boolean>;
}

/**
 * Boolean flags that never consume the next argv as a value. Without this
 * list the parser greedily reads the next non-`--` token as the flag's
 * value, which breaks intuitive invocations like `apex visibility --local
 * cloudflare.com` — the URL would be eaten as the value of `--local`.
 *
 * Add a flag here whenever it's a pure boolean toggle.
 */
const BOOLEAN_FLAGS = new Set([
  "local",
  "dry-run",
  "force",
  "verbose",
  "quiet",
]);

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
        continue;
      }
      const name = a.slice(2);
      if (BOOLEAN_FLAGS.has(name)) {
        out.options[name] = true;
        continue;
      }
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out.options[name] = next;
        i++;
      } else {
        out.options[name] = true;
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

/**
 * Resolve a target URL from either `--url <value>` or the first positional arg,
 * and auto-prepend `https://` when the user typed a bare domain.
 *
 * Friendliness: `apex visibility example.com` should Just Work.
 */
export function resolveUrl(f: ParsedFlags): string | undefined {
  const raw =
    (f.options.url as string | undefined) ??
    f.positional.find((p) => !p.startsWith("-"));
  if (!raw) return undefined;
  // Already a full URL?
  if (/^https?:\/\//i.test(raw)) return raw;
  // Bare domain — prepend https. Strip leading slashes if any.
  return `https://${raw.replace(/^\/+/, "")}`;
}
