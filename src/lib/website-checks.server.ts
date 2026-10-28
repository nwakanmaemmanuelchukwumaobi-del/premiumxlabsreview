import { parseDocument } from "htmlparser2";
import { findAll, textContent } from "domutils";

export type WebsiteChecks = {
  status: "completed" | "no website" | "skipped";
  website: string | null;
  checked_at: string;
  page: Record<string, unknown>;
  pagespeed: Record<string, unknown>;
  storage?: string;
};

export function publicWebsiteURL(value: string): URL {
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
  const host = url.hostname.toLowerCase();
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port ||
    !host.includes(".") || host.includes(":") || /^\d+(\.\d+){3}$/.test(host) ||
    /(^|\.)(localhost|local|internal|lan|home|test|invalid|example)$/.test(host) || host.endsWith(".")) {
    throw new Error("Website must be a public HTTP or HTTPS domain.");
  }
  return url;
}

export function isPublicAddress(address: string): boolean {
  if (address.includes(":")) return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:(db8|0*:)/i.test(address);
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === undefined || b === undefined) return false;
  return !(a === 0 || a === 10 || a === 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 ||
    a === 192 && (b === 168 || b === 0 || b === 2) || a === 100 && b >= 64 && b <= 127 ||
    a === 198 && (b === 18 || b === 19 || b === 51) || a === 203 && b === 0 || a >= 224);
}

async function boundedText(response: Response, limit: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("Response too large");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}

async function assertPublicDNS(url: URL, signal: AbortSignal, request: typeof fetch) {
  const answers = await Promise.all(["A", "AAAA"].map(async (type) => {
    const endpoint = new URL("https://cloudflare-dns.com/dns-query");
    endpoint.searchParams.set("name", url.hostname);
    endpoint.searchParams.set("type", type);
    const response = await request(endpoint, { signal, headers: { Accept: "application/dns-json" } });
    if (!response.ok) throw new Error("DNS check failed");
    const result = JSON.parse(await boundedText(response, 64000)) as { Status?: number; Answer?: { type: number; data: string }[] };
    if (result.Status !== 0) throw new Error("DNS check failed");
    return (result.Answer ?? []).filter((a) => a.type === 1 || a.type === 28).map((a) => a.data);
  }));
  const addresses = answers.flat();
  if (!addresses.length || addresses.some((address) => !isPublicAddress(address))) throw new Error("Non-public website blocked");
}

export function inspectHTML(html: string, finalURL: string, submittedURL: string) {
  const document = parseDocument(html);
  const elements = findAll(() => true, document.children);
  const clean = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 2000);
  const title = elements.find((e) => e.name === "title");
  const description = elements.find((e) => e.name === "meta" && e.attribs['name']?.toLowerCase() === "description");
  const headline = elements.find((e) => e.name === "h1");
  const contact: { type: string; text: string; href: string | null }[] = [];
  const social: { platform: string; url: string }[] = [];
  const networks = ["instagram.com", "facebook.com", "tiktok.com", "twitter.com", "x.com", "youtube.com", "youtu.be", "linkedin.com", "snapchat.com"];
  for (const element of elements) {
    if (element.name !== "a" && element.name !== "button") continue;
    const href = element.attribs['href'] ?? "";
    const text = clean(textContent(element));
    const label = `${text} ${element.attribs["aria-label"] ?? ""}`;
    if (/^(tel:|mailto:)/i.test(href) || /(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(href) || /\b(contact|call|book|enquir|quote|buy|shop|order|get started|sign up)/i.test(label)) {
      contact.push({ type: href.startsWith("tel:") ? "phone" : /whatsapp|wa\.me/i.test(href) ? "WhatsApp" : "contact/action", text, href: href || null });
    }
    if (element.name === "a" && href) {
      try {
        const link = new URL(href, finalURL);
        const platform = networks.find((host) => link.hostname === host || link.hostname.endsWith(`.${host}`));
        if (platform && ["http:", "https:"].includes(link.protocol)) social.push({ platform, url: link.href });
      } catch { /* Ignore malformed links independently. */ }
    }
  }
  const lower = html.toLowerCase();
  const ad_trackers: string[] = [];
  if (/connect\.facebook\.net\/[^"']*fbevents\.js|fbq\(\s*['"]init/.test(lower)) ad_trackers.push("Meta Pixel");
  if (/googletagmanager\.com|google-analytics\.com|googleadservices\.com|gtag\(\s*['"]config/.test(lower)) ad_trackers.push("Google tag");
  if (/analytics\.tiktok\.com|ttq\.load\(/.test(lower)) ad_trackers.push("TikTok Pixel");
  const metaTag = (key: string) => elements.some((e) => e.name === "meta" && [e.attribs['property'], e.attribs['name']].some((v) => v?.toLowerCase() === key) && !!e.attribs['content']?.trim());
  const sharing_tags = Object.fromEntries(["og:title", "og:description", "og:image", "twitter:card"].map((k) => [k, metaTag(k)]));
  return { status: "completed", ad_trackers_detected: ad_trackers, ad_tracking_method: "Static HTML only; tags loaded later or via other tools may not be visible.",
    sharing_tags, sharing_tags_missing: Object.keys(sharing_tags).filter((k) => !sharing_tags[k]), final_url: finalURL, submitted_uses_https: new URL(submittedURL).protocol === "https:",
    uses_https: new URL(finalURL).protocol === "https:", title: title ? clean(textContent(title)) : null,
    meta_description: description?.attribs['content'] ? clean(description.attribs['content']) : null,
    main_headline: headline ? clean(textContent(headline)) : null,
    contact_or_action_present: contact.length > 0, contact_or_action_evidence: contact.slice(0, 25),
    social_links_present: social.length > 0, social_links: social.slice(0, 25),
    method: "Static homepage HTML; does not execute JavaScript. Contact/action detection is heuristic." };
}

async function pageChecks(url: URL, request: typeof fetch) {
  const signal = AbortSignal.timeout(15000);
  let current = url;
  for (let hop = 0; hop <= 4; hop++) {
    await assertPublicDNS(current, signal, request);
    const response = await request(current, { redirect: "manual", signal, headers: { Accept: "text/html" } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("Missing redirect location");
      current = publicWebsiteURL(new URL(location, current).href);
      continue;
    }
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw new Error("Page unavailable or not HTML");
    return inspectHTML(await boundedText(response, 1500000), current.href, url.href);
  }
  throw new Error("Too many redirects");
}

const SEO_PLAIN: Record<string, string> = {
  "meta-description": "No page description for search results", "document-title": "No page title for search results",
  "link-text": "Some links don't say where they go", "is-crawlable": "The page is blocked from search engines",
  "http-status-code": "The page returned an error to search engines", "image-alt": "Images have no descriptions",
  "crawlable-anchors": "Some links can't be followed by search engines", "robots-txt": "The search engine rules file has problems",
  "canonical": "The page's preferred address is set up incorrectly", "hreflang": "Language settings are set up incorrectly",
  "structured-data": "Business details for search engines have problems",
};
export function seoFailures(lighthouse: any): string[] {
  const refs: { id: string }[] = lighthouse?.categories?.seo?.auditRefs ?? [];
  return refs.map((r) => ({ id: r.id, a: lighthouse.audits?.[r.id] }))
    .filter(({ a }) => a && typeof a.score === "number" && a.score < 1 && ["binary", "numeric"].includes(a.scoreDisplayMode))
    .map(({ id, a }) => SEO_PLAIN[id] ?? String(a.title ?? id).slice(0, 120)).slice(0, 8);
}

async function speedChecks(url: URL, key: string | undefined, request: typeof fetch): Promise<Record<string, unknown>> {
  if (!key) return { status: "skipped", reason: "PAGESPEED_API_KEY is not configured", strategy: "mobile" };
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url.href);
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.set("key", key);
  endpoint.searchParams.append("category", "performance");
  endpoint.searchParams.append("category", "seo");
  const response = await request(endpoint, { signal: AbortSignal.timeout(45000) });
  // Do not log provider errors: they can contain the request URL and secret.
  if (!response.ok) return { status: "skipped", reason: "PageSpeed request failed", http_status: response.status, strategy: "mobile" };
  const result = JSON.parse(await boundedText(response, 8000000));
  const lighthouse = result.lighthouseResult;
  if (!lighthouse || lighthouse.runtimeError) return { status: "skipped", reason: "PageSpeed could not analyse this website", strategy: "mobile" };
  const metrics = ["first-contentful-paint", "largest-contentful-paint", "speed-index", "total-blocking-time", "cumulative-layout-shift", "interactive"];
  return { status: "completed", strategy: "mobile", analysis_time: result.analysisUTCTimestamp ?? null,
    final_url: lighthouse.finalUrl ?? null, lighthouse_version: lighthouse.lighthouseVersion ?? null,
    performance_score: lighthouse.categories?.performance?.score ?? null,
    seo_score: lighthouse.categories?.seo?.score ?? null, seo_failed_checks: seoFailures(lighthouse),
    metrics: Object.fromEntries(metrics.map((id) => [id, lighthouse.audits?.[id] ?? null])),
    loading_experience: result.loadingExperience ?? null, origin_loading_experience: result.originLoadingExperience ?? null };
}

export async function runWebsiteChecks(website: string | undefined, key: string | undefined, request: typeof fetch = fetch): Promise<WebsiteChecks> {
  const base = { website: website ?? null, checked_at: new Date().toISOString() };
  if (!website) return { ...base, status: "no website", page: { status: "skipped", reason: "no website" }, pagespeed: { status: "skipped", reason: "no website" } };
  let url: URL;
  try { url = publicWebsiteURL(website); } catch {
    return { ...base, status: "skipped", page: { status: "skipped", reason: "Invalid or non-public website URL" }, pagespeed: { status: "skipped", reason: "Invalid or non-public website URL" } };
  }
  const [page, pagespeed] = await Promise.all([
    pageChecks(url, request).catch(() => ({ status: "skipped", reason: "Website fetch, DNS safety check, or parsing failed" })),
    speedChecks(url, key, request).catch(() => ({ status: "skipped", reason: "PageSpeed unavailable or timed out", strategy: "mobile" })),
  ]);
  return { ...base, website: url.href, status: "completed", page, pagespeed };
}

export async function saveThenCheck<T>(save: () => Promise<T>, check: () => Promise<WebsiteChecks>, persist: (saved: T, result: WebsiteChecks) => Promise<void>) {
  const saved = await save();
  let results: WebsiteChecks;
  try { results = await check(); } catch {
    results = { status: "skipped", website: null, checked_at: new Date().toISOString(), page: { status: "skipped" }, pagespeed: { status: "skipped" } };
  }
  try { await persist(saved, results); } catch { results.storage = "Request saved; results could not be stored."; }
  return results;
}
