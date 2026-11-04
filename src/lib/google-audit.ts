import { z } from "zod";

export const CACHE_HOURS = 24;
export const SOCIAL_REVIEW = "Your social media review will arrive within 24 hours.";
export const ADS_NOTE = "Want faster results? Running Google Ads on your best searches can bring inquiries while we fix your site.";
export const offerSchema = z.enum(["Products", "Services", "Both"]);
export type SearchContext = { business_name: string; offering_type: z.infer<typeof offerSchema>; main_offering: string; main_service?: string | null; city: string; state: string };
export const normalizeState = (v: string) => /^(fct|federal capital territory)$/i.test(v.trim()) ? "Abuja" : v.trim();
const queryText = (v: string) => v.replace(/\bnigeria\b/gi, "").replace(/[^\p{L}\p{N}\s&'-]/gu, " ").replace(/\s+/g, " ").trim();
const dedupe = (items: string[]) => { const seen = new Set<string>(); return items.filter(q => { const k = q.toLowerCase().replace(/\s+/g, " ").trim(); if (!k || /\boptions\b/i.test(q) || seen.has(k)) return false; seen.add(k); return true; }); };
/** Four distinct buyer-style phrases (case-insensitive) followed by the business name. */
export function auditQueries(a: SearchContext, second?: string | null): string[] {
  const main = queryText(a.main_offering), city = queryText(a.city), state = queryText(normalizeState(a.state));
  const extra = second ? queryText(second) : "";
  const service = queryText(a.main_service || main);
  const products = [`${main} ${city}`, `${main} shop ${city}`, `best ${main} ${city}`, `buy ${main} ${city}`, `${main} store ${city}`, `${main} ${state}`, `buy ${main} ${state}`, extra && `${extra} ${city}`, `${main} store ${state}`];
  const services = [`${main} ${city}`, `${main} company ${city}`, `best ${main} ${city}`, `${main} ${state}`, extra && `${extra} ${city}`, `${main} company ${state}`, `best ${main} ${state}`, `${main} services ${city}`];
  const both = [`${main} ${city}`, `buy ${main} ${city}`, `${service} ${city}`, `${service} company ${city}`, `${main} shop ${city}`, `best ${service} ${city}`, `best ${main} ${city}`, `${main} ${state}`, `${service} ${state}`];
  const list = a.offering_type === "Products" ? (extra ? [products[0], products[1], products[3], products[7], ...products] : products) : a.offering_type === "Services" ? (extra ? [services[0], services[1], services[2], services[4], ...services] : services) : both;
  const name = queryText(a.business_name);
  const phrases = dedupe(list.filter(Boolean) as string[]).filter(q => q.toLowerCase() !== name.toLowerCase()).slice(0, 4);
  return [...phrases, name];
}
export function websiteDomain(value: string | null | undefined): string | null {
  if (!value) return null;
  try { const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); return ["http:", "https:"].includes(u.protocol) ? u.hostname.toLowerCase().replace(/^www\./, "") : null; } catch { return null; }
}
export function sameDomain(link: string, domain: string | null): boolean {
  const host = websiteDomain(link);
  return !!host && !!domain && (host === domain || host.endsWith(`.${domain}`));
}
const EXCLUDED = ["infoisinfo.com", "infoisinfo.com.ng", "ordernow.ng", "ordernow.com", "facebook.com", "instagram.com", "tiktok.com", "x.com", "twitter.com", "linkedin.com", "youtube.com", "google.com", "google.com.ng", "business.site", "jiji.ng", "jumia.com.ng", "konga.com", "amazon.com", "alibaba.com", "aliexpress.com", "finelib.com", "businesslist.com.ng", "vconnect.com", "connectnigeria.com", "ngex.com", "yelp.com", "tripadvisor.com", "clutch.co", "sortlist.com", "goodfirms.co", "trustpilot.com", "booking.com", "nigeriagalleria.com", "yellowpages.com", "dealersng.com", "upwork.com", "fiverr.com", "freelancer.com", "peopleperhour.com", "toptal.com", "bark.com", "etsy.com", "ebay.com", "indeed.com", "ng.indeed.com", "jobberman.com", "myjobmag.com", "hotnigerianjobs.com", "glassdoor.com", "ngcareers.com", "jobgurus.com.ng", "olx.com.ng", "nairaland.com", "pinterest.com", "quora.com", "reddit.com", "wikipedia.org", "punchng.com", "vanguardngr.com", "guardian.ng", "premiumtimesng.com", "thisdaylive.com", "legit.ng", "pulse.ng", "dailytrust.com", "thenationonlineng.net", "channelstv.com", "bbc.com", "cnn.com", "businessday.ng", "techcabal.com", "nairametrics.com", "tiktok.com", "snapchat.com", "threads.net", "whatsapp.com", "wa.me", "jiji.com.ng", "jumia.com", "kilimall.ng", "slot.ng", "pointekonline.com", "ubuy.com.ng", "takealot.com", "temu.com", "shein.com", "yellowpages.com.ng", "nigeriayellowpages.com", "brownbook.net", "cylex.com.ng", "mapquest.com", "foursquare.com", "waze.com", "bing.com"];
export const organicSchema = z.object({ title: z.string().max(1000), link: z.string().max(2000), position: z.number().int().min(1).max(10) });
export type OrganicResult = z.infer<typeof organicSchema>;
export function eligibleCompetitors(results: OrganicResult[], domain: string | null): OrganicResult[] {
  const seen = new Set<string>();
  return results.filter(r => {
    const host = websiteDomain(r.link);
    if (!host || sameDomain(r.link, domain) || seen.has(host) || EXCLUDED.some(d => sameDomain(r.link, d)) || /\b(directory|marketplace|listings?|top \d+|list of|yellow pages|business listings|jobs?|vacanc(y|ies)|hiring|careers?|classifieds?|news)\b/i.test(r.title) || /(^|\.)(jobs?|careers|news)\./i.test(host)) return false;
    seen.add(host); return true;
  }).slice(0, 3);
}
export function competitorPool(searches: { competitors: OrganicResult[] }[]): OrganicResult[] {
  const seen = new Set<string>();
  return searches.slice(0, 4).flatMap(s => s.competitors).filter(c => { const h = websiteDomain(c.link); if (!h || seen.has(h)) return false; seen.add(h); return true; });
}
const speedSchema = z.object({ seconds: z.number().nonnegative().nullable(), performance: z.number().min(0).max(1).nullable() });
export const searchSchema = z.object({ query: z.string().max(600), status: z.enum(["completed", "unavailable"]), position: z.number().int().min(1).max(10).nullable(), competitors: z.array(organicSchema.extend({ speed: speedSchema, comparison: z.string().max(1200) })).max(3) });
export const healthSchema = z.object({ seo_score: z.number().int().min(0).max(100).nullable(), checklist: z.array(z.object({ label: z.string().max(80), ok: z.boolean() })).max(4), problems: z.array(z.string().max(300)).max(3) });
export type WebsiteHealth = z.infer<typeof healthSchema>;
export const reportSchema = z.object({ offering: z.string().max(150).optional(), city: z.string().max(150).optional(), version: z.literal(1), business: z.string().max(150), website: z.string().max(2000).nullable(), location: z.string().max(400), checked_at: z.string(), searches: z.array(searchSchema).max(5), speed: speedSchema, maps: z.object({ status: z.enum(["matched", "not found", "unavailable", "unconfirmed"]), rating: z.number().min(0).max(5).nullable(), reviews: z.number().int().nonnegative().nullable() }), score: z.object({ earned: z.number().min(0).max(100), coverage: z.number().min(0).max(100), complete: z.boolean() }), fixes: z.array(z.string().max(600)).max(3), speed_competitors: z.array(z.object({ title: z.string().max(1000), link: z.string().max(2000), speed: speedSchema })).max(2).optional(), health: healthSchema.optional() });
export type GoogleReport = z.infer<typeof reportSchema>;
export const visibility = (position: number | null) => position === null ? 0 : (11 - position) / 10;
export function calculateScore(searches: GoogleReport["searches"], performance: number | null, rating: number | null) {
  let earned = 0, coverage = 0;
  searches.slice(0, 4).forEach(s => { if (s.status === "completed") { earned += visibility(s.position) * 12.5; coverage += 12.5; } });
  if (performance !== null) { earned += Math.max(0, Math.min(1, performance)) * 30; coverage += 30; }
  const name = searches[4];
  if (name?.status === "completed") { earned += visibility(name.position) * 10; coverage += 10; }
  if (rating !== null) { earned += Math.max(0, Math.min(5, rating)) / 5 * 10; coverage += 10; }
  return { earned: Math.round(earned), coverage, complete: coverage === 100 };
}
export function isFreshCache(expires: string | null | undefined, now = Date.now()): boolean { return !!expires && new Date(expires).getTime() > now; }
const words = (v: string) => v.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 2);
const mentions = (text: string, target: string) => { const t = text.toLowerCase(); const w = words(target); return !!w.length && w.every(x => t.includes(x.replace(/s$/, ""))); };
/** Homepage health block: PageSpeed search-setup score, a short checklist and at most 3 plain problems. */
export function websiteHealth(page: Record<string, unknown>, pagespeed: Record<string, unknown>, offering?: string, city?: string): WebsiteHealth | null {
  const seo = pagespeed['status'] === "completed" && typeof pagespeed['seo_score'] === "number" ? Math.round(Math.max(0, Math.min(1, pagespeed['seo_score'])) * 100) : null;
  if (page['status'] !== "completed") return seo === null ? null : { seo_score: seo, checklist: [], problems: [] };
  const evidence = Array.isArray(page['contact_or_action_evidence']) ? page['contact_or_action_evidence'] as { type?: string; href?: string | null }[] : [];
  const social = Array.isArray(page['social_links']) ? page['social_links'] as { platform?: string }[] : [];
  const links = Array.isArray(page['offering_links']) ? page['offering_links'] as { label?: string; url?: string }[] : [];
  const headline = typeof page['main_headline'] === "string" ? page['main_headline'].trim() : "";
  const checklist = [
    { label: "WhatsApp or call button", ok: evidence.some(e => e.type === "WhatsApp" || e.type === "phone") },
    { label: "Contact or quote form", ok: page['contact_form_found'] === true || page['quote_form_found'] === true },
    { label: "Instagram and Facebook links", ok: ["instagram.com", "facebook.com"].every(p => social.some(s => s.platform === p)) },
    { label: "Clear headline", ok: headline.length >= 8 },
  ];
  const problems: string[] = [];
  const title = typeof page['title'] === "string" ? page['title'].trim() : "";
  if (!title) problems.push("Your homepage has no page title, so Google has no clear name to show for it.");
  else if (title.length < 15 || (offering && !mentions(title, offering) && !(city && mentions(title, city)))) problems.push(`Your page title "${title.slice(0, 60)}" doesn't say what you sell${city ? ` or that you're in ${city}` : ""}.`);
  if (typeof page['meta_description'] !== "string" || !page['meta_description'].trim()) problems.push("Your homepage has no short description for Google to show under your name.");
  if (offering && !links.some(l => mentions(`${l.label ?? ""} ${l.url ?? ""}`, offering))) problems.push(`There's no separate page for ${offering}, so Google has nothing specific to show buyers searching for it.`);
  return { seo_score: seo, checklist, problems: problems.slice(0, 3) };
}
type FixContext = { offering?: string; city?: string; competitorSpeed?: { name: string; seconds: number } | null };
export function reportFixes(searches: GoogleReport["searches"], speed: GoogleReport["speed"], page: Record<string, unknown>, ctx: FixContext = {}): string[] {
  const fixes: string[] = [];
  const done = searches.slice(0, 4).filter(s => s.status === "completed");
  const missing = done.filter(s => s.position === null);
  const low = done.filter(s => s.position !== null && s.position > 3);
  if (missing[0]) fixes.push(`Create a page for "${missing[0].query}" with that phrase in its title and headline, so buyers searching it can find you.`);
  if (low[0]) fixes.push(`You're #${low[0].position} for "${low[0].query}". Add photos, prices and a WhatsApp button to that page to move into the top 3.`);
  if (speed.seconds !== null && speed.seconds >= 1.8) {
    const c = ctx.competitorSpeed;
    fixes.push(c && c.seconds < speed.seconds ? `Your homepage takes ${speed.seconds.toFixed(1)}s to show on a phone, while ${c.name} takes ${c.seconds.toFixed(1)}s. Shrink large images to close the gap.` : `Your homepage takes ${speed.seconds.toFixed(1)}s to show on a phone. Shrink large images so it appears in under 1.8s.`);
  }
  if (missing[1]) fixes.push(`Add a section for "${missing[1].query}" to your site so you also show up for that search.`);
  if (page['status'] === "completed") {
    const title = typeof page['title'] === "string" ? page['title'].trim() : "";
    if (!page['contact_or_action_present']) fixes.push("Put a WhatsApp or call button at the top of your homepage so visitors can reach you in one tap.");
    if (!title && ctx.offering) fixes.push(`Give your homepage the title "${ctx.offering}${ctx.city ? ` in ${ctx.city}` : ""}" so Google knows what you sell.`);
    if (!page['main_headline']) fixes.push(`Add a headline at the top of your homepage that says you offer ${ctx.offering ?? "your main product or service"}${ctx.city ? ` in ${ctx.city}` : ""}.`);
    if (!page['uses_https']) fixes.push("Switch your website to a secure (https) address so browsers don't warn visitors away.");
  }
  if (missing[2]) fixes.push(`Create a page for "${missing[2].query}" too, so that search leads to you instead of competitors.`);
  return [...new Set(fixes)].slice(0, 3);
}
export const REPORT_STEPS = ["Checking Google for your searches", "Testing your website speed", "Comparing you with competitors", "Writing your report"] as const;
export const scoreBand = (score: number) => score >= 75 ? "Good" : score >= 40 ? "Fair" : "Low";
export function reportHeadline(report: GoogleReport): string {
 const checks = report.searches.slice(0, 4).filter(s => s.status === "completed");
 const found = checks.filter(s => s.position !== null);
 const offering = report.offering ?? report.searches[0]?.query ?? report.business;
 const city = report.city ?? report.location.split(",")[0];
 if (!checks.length) return `Your online visibility report for ${report.business}`;
 if (!found.length) return `When customers search for ${offering} in ${city}, they find your competitors, not you.`;
 if (found.length === checks.length) return `Customers can find you when they search for ${offering} in ${city}.`;
 return `Customers find you for some ${offering} searches in ${city}, but competitors appear for others.`;
}
