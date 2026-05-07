import type { FetchedPage, LocalAuditInput, SiteContext } from "./types.js";

const DEFAULT_UA =
  "ApexSkill/0.1 (+https://github.com/getapexradar/apex; local-audit)";

async function fetchText(
  url: string,
  ua: string,
  timeoutMs: number,
): Promise<{ status: number; body: string; headers: Record<string, string> }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": ua, accept: "text/html,*/*" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v;
    });
    const body = await res.text();
    return { status: res.status, body, headers };
  } finally {
    clearTimeout(t);
  }
}

export async function buildSiteContext(
  input: LocalAuditInput,
): Promise<SiteContext> {
  const ua = input.userAgent ?? DEFAULT_UA;
  const timeoutMs = input.timeoutMs ?? 15_000;
  const target = new URL(input.url);
  const origin = `${target.protocol}//${target.host}`;

  const [robots, llms, root, sitemap] = await Promise.allSettled([
    fetchText(`${origin}/robots.txt`, ua, timeoutMs),
    fetchText(`${origin}/llms.txt`, ua, timeoutMs),
    fetchText(input.url, ua, timeoutMs),
    fetchText(`${origin}/sitemap.xml`, ua, timeoutMs),
  ]);

  const pages: FetchedPage[] = [];
  if (root.status === "fulfilled" && root.value.status < 400) {
    pages.push({
      url: input.url,
      status: root.value.status,
      html: root.value.body,
      headers: root.value.headers,
      fetchedAt: new Date().toISOString(),
    });
  } else if (root.status === "fulfilled") {
    pages.push({
      url: input.url,
      status: root.value.status,
      html: "",
      headers: root.value.headers,
      fetchedAt: new Date().toISOString(),
    });
  }

  return {
    origin,
    robotsTxt:
      robots.status === "fulfilled" && robots.value.status === 200
        ? robots.value.body
        : null,
    llmsTxt:
      llms.status === "fulfilled" && llms.value.status === 200
        ? llms.value.body
        : null,
    sitemapXml:
      sitemap.status === "fulfilled" && sitemap.value.status === 200
        ? sitemap.value.body
        : null,
    pages,
  };
}
