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
  const answers: string[][] = [];
  for (const type of ["A", "AAAA"]) {
    const endpoint = new URL("https://cloudflare-dns.com/dns-query");
    endpoint.searchParams.set("name", url.hostname);
    endpoint.searchParams.set("type", type);
    const response = await request(endpoint, { signal, headers: { Accept: "application/dns-json" } });
    if (!response.ok) throw new Error("DNS check failed");
    const result = JSON.parse(await boundedText(response, 64000)) as { Status?: number; Answer?: { type: number; data: string }[] };
    if (result.Status !== 0) throw new Error("DNS check failed");
    answers.push((result.Answer ?? []).filter((a) => a.type === 1 || a.type === 28).map((a) => a.data));
  }
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
  const offering_links = elements.filter(e => e.name === "a" && e.attribs['href']).flatMap(e => {
    try {
      const target = new URL(e.attribs['href'] ?? "", finalURL);
      const label = clean(textContent(e));
      return target.hostname === new URL(finalURL).hostname && target.pathname !== "/" && ["https:", "http:"].includes(target.protocol) && label && !/^(home|about|contact|privacy|terms|login|sign in|blog|news|cart|checkout)$/i.test(label) ? [{ label, url: target.href }] : [];
    } catch { return []; }
  }).slice(0, 40);
  const quote_form_found = elements.some(e => e.name === "form" && /quote|enquir|request|consult/i.test(textContent(e)));
  const contact_form_found = elements.some(e => e.name === "form" && findAll(x => x.name === "textarea" || (x.name === "input" && /^(email|tel)$/i.test(x.attribs['type'] ?? "")), e.children).length > 0);
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
    offering_links, quote_form_found, contact_form_found,
    method: "Static homepage HTML; does not execute JavaScript. Contact/action detection is heuristic." };
}

async function pageChecks(url: URL, request: typeof fetch, timeout = 15000) {
  const signal = AbortSignal.timeout(timeout);
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
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Homepage HTTP ${response.status}`); }
    if (!response.headers.get("content-type")?.includes("text/html")) { await response.body?.cancel(); throw new Error("Homepage response is not HTML"); }
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

const pause = () => new Promise(resolve => setTimeout(resolve, 500));
function safeFailure(error: unknown): string {
  if (error instanceof Error) {
    if (/timeout|abort/i.test(error.name)) return "timeout";
    if (/^Homepage HTTP \d+$|^Homepage response is not HTML$|^DNS check failed$|^Non-public website blocked$|^Too many redirects$|^Response too large$/.test(error.message)) return error.message;
    if (error instanceof SyntaxError) return "bad response";
  }
  return "network or parsing failure";
}
async function speedRun(url: URL, key: string, category: "performance" | "seo", request: typeof fetch, timeout: number, attempts = 2): Promise<Record<string, unknown>> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let failure: Record<string, unknown>;
    try {
      const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
      endpoint.searchParams.set("url", url.href); endpoint.searchParams.set("strategy", "mobile");
      endpoint.searchParams.set("key", key); endpoint.searchParams.set("category", category);
      const response = await request(endpoint, { signal: AbortSignal.timeout(timeout) });
      if (!response.ok) {
        // Never log raw provider messages or request URLs, which may contain the key.
        let code: string | null = null;
        try { const body = JSON.parse(await boundedText(response, 64000)); const status = body?.error?.status; if (typeof status === "string" && /^[A-Z_]{1,80}$/.test(status)) code = status; } catch { /* HTTP status remains useful. */ }
        failure = { status: "skipped", reason: response.status === 429 ? "rate limit or quota" : "PageSpeed HTTP error", http_status: response.status, provider_code: code };
      } else {
        const result = JSON.parse(await boundedText(response, 8000000));
        const lighthouse = result.lighthouseResult;
        if (!lighthouse || lighthouse.runtimeError || typeof lighthouse.categories?.[category]?.score !== "number") {
          const code = lighthouse?.runtimeError?.code;
          failure = { status: "skipped", reason: "PageSpeed bad response or analysis error", provider_code: typeof code === "string" && /^[A-Z_]{1,80}$/.test(code) ? code : null };
        } else {
          const metrics = ["first-contentful-paint", "largest-contentful-paint", "speed-index", "total-blocking-time", "cumulative-layout-shift", "interactive"];
          return { status: "completed", strategy: "mobile", analysis_time: result.analysisUTCTimestamp ?? null,
            final_url: lighthouse.finalUrl ?? null, lighthouse_version: lighthouse.lighthouseVersion ?? null,
            performance_score: category === "performance" ? lighthouse.categories.performance.score : null,
            seo_score: category === "seo" ? lighthouse.categories.seo.score : null, seo_failed_checks: category === "seo" ? seoFailures(lighthouse) : [],
            metrics: category === "performance" ? Object.fromEntries(metrics.map(id => [id, lighthouse.audits?.[id] ?? null])) : {},
            loading_experience: result.loadingExperience ?? null, origin_loading_experience: result.originLoadingExperience ?? null };
        }
      }
    } catch (error) { failure = { status: "skipped", reason: safeFailure(error) }; }
    console.error("Audit PageSpeed check failed", { host: url.hostname, category, attempt, timeout_ms: timeout, ...failure });
    if (attempt === attempts) return { ...failure, strategy: "mobile" };
    await pause();
  }
  return { status: "skipped", strategy: "mobile" };
}
async function speedChecks(url: URL, key: string | undefined, request: typeof fetch, timeout = 30000, includeSEO = true, onPerformance?: (result: Record<string, unknown>) => Promise<void>): Promise<Record<string, unknown>> {
  if (!key) return { status: "skipped", reason: "PAGESPEED_API_KEY is not configured", strategy: "mobile" };
  const performance = await speedRun(url, key, "performance", request, timeout);
  if (onPerformance) await onPerformance(performance);
  if (!includeSEO) return performance;
  const seo = await speedRun(url, key, "seo", request, timeout);
  return { ...performance, status: performance['status'] === "completed" || seo['status'] === "completed" ? "completed" : "skipped",
    seo_status: seo['status'], seo_score: seo['seo_score'] ?? null, seo_failed_checks: seo['seo_failed_checks'] ?? [],
    seo_error: seo['status'] !== "completed" ? seo : null };
}

export async function runMobilePerformance(website: string, key: string | undefined, request: typeof fetch = fetch): Promise<Record<string, unknown>> {
  if (!key) return { status: "skipped", reason: "PAGESPEED_API_KEY is not configured" };
  try { return await speedRun(publicWebsiteURL(website), key, "performance", request, 8000, 1); }
  catch { return { status: "skipped", reason: "Invalid website" }; }
}

export async function runWebsiteChecks(website: string | undefined, key: string | undefined, request: typeof fetch = fetch, limits: { page?: number; speed?: number; seo?: boolean; performance?: boolean; progress?: (checks: WebsiteChecks) => Promise<void> } = {}): Promise<WebsiteChecks> {
  const base = { website: website ?? null, checked_at: new Date().toISOString() };
  if (!website) return { ...base, status: "no website", page: { status: "skipped", reason: "no website" }, pagespeed: { status: "skipped", reason: "no website" } };
  let url: URL;
  try { url = publicWebsiteURL(website); } catch {
    return { ...base, status: "skipped", page: { status: "skipped", reason: "Invalid or non-public website URL" }, pagespeed: { status: "skipped", reason: "Invalid or non-public website URL" } };
  }
  const pageWork = (async () => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try { return await pageChecks(url, request, limits.page); } catch (error) {
        const reason = safeFailure(error);
        console.error("Audit homepage check failed", { host: url.hostname, attempt, reason });
        if (attempt === 2 || error instanceof Error && /Non-public|blocked|public HTTP|redirect/i.test(error.message)) return { status: "skipped", reason };
        await pause();
      }
    }
    return { status: "skipped" };
  })();
  const [page, pagespeed] = await Promise.all([
    pageWork,
    limits.performance === false ? Promise.resolve({ status: "skipped" }) : speedChecks(url, key, request, limits.speed, limits.seo, limits.progress ? async result => { const page = await pageWork; await limits.progress?.({ ...base, website: url.href, status: "completed", page, pagespeed: result }); } : undefined),
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
