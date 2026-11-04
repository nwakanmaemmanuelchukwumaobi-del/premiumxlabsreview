import { z } from "zod";

export const CACHE_HOURS = 24;
export const SOCIAL_REVIEW = "Your social media review will arrive within 24 hours.";
export const ADS_NOTE = "Want faster results? Running Google Ads on your best searches can bring inquiries while we fix your site.";
export const offerSchema = z.enum(["Products", "Services", "Both"]);
export type SearchContext = { business_name: string; offering_type: z.infer<typeof offerSchema>; main_offering: string; main_service?: string | null; city: string; state: string };
export const normalizeState = (v: string) => /^(fct|federal capital territory)$/i.test(v.trim()) ? "Abuja" : v.trim();
const queryText = (v: string) => v.replace(/\bnigeria\b/gi, "").replace(/[^\p{L}\p{N}\s&'-]/gu, " ").replace(/\s+/g, " ").trim();
export function auditQueries(a: SearchContext, second?: string | null): string[] {
  const main = queryText(a.main_offering), city = queryText(a.city), state = queryText(normalizeState(a.state));
  const secondary = queryText(second || `${main} options`);
  if (a.offering_type === "Products") return [`${main} ${city}`, `${main} ${state}`, `buy ${main} ${state}`, `${secondary} ${city}`, queryText(a.business_name)];
  if (a.offering_type === "Services") return [`${main} ${city}`, `${main} company ${city}`, `best ${main} ${city}`, `${secondary} ${state}`, queryText(a.business_name)];
  const service = queryText(a.main_service || main);
  return [`${main} ${city}`, `buy ${main} ${state}`, `${service} ${city}`, `${service} company ${state}`, queryText(a.business_name)];
}
export function websiteDomain(value: string | null | undefined): string | null {
  if (!value) return null;
  try { const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); return ["http:", "https:"].includes(u.protocol) ? u.hostname.toLowerCase().replace(/^www\./, "") : null; } catch { return null; }
}
export function sameDomain(link: string, domain: string | null): boolean {
  const host = websiteDomain(link);
  return !!host && !!domain && (host === domain || host.endsWith(`.${domain}`));
}
const EXCLUDED = ["infoisinfo.com", "infoisinfo.com.ng", "ordernow.ng", "ordernow.com", "facebook.com", "instagram.com", "tiktok.com", "x.com", "twitter.com", "linkedin.com", "youtube.com", "google.com", "google.com.ng", "business.site", "jiji.ng", "jumia.com.ng", "konga.com", "amazon.com", "alibaba.com", "aliexpress.com", "finelib.com", "businesslist.com.ng", "vconnect.com", "connectnigeria.com", "ngex.com", "yelp.com", "tripadvisor.com", "clutch.co", "sortlist.com", "goodfirms.co", "trustpilot.com", "booking.com", "nigeriagalleria.com", "yellowpages.com", "dealersng.com", "upwork.com", "fiverr.com", "freelancer.com", "peopleperhour.com", "toptal.com", "bark.com", "etsy.com", "ebay.com"];
export const organicSchema = z.object({ title: z.string().max(1000), link: z.string().max(2000), position: z.number().int().min(1).max(10) });
export type OrganicResult = z.infer<typeof organicSchema>;
export function eligibleCompetitors(results: OrganicResult[], domain: string | null): OrganicResult[] {
  const seen = new Set<string>();
  return results.filter(r => {
    const host = websiteDomain(r.link);
    if (!host || sameDomain(r.link, domain) || seen.has(host) || EXCLUDED.some(d => sameDomain(r.link, d)) || /\b(directory|marketplace|listing|top \d+|list of|yellow pages|business listings)\b/i.test(r.title)) return false;
    seen.add(host); return true;
  }).slice(0, 3);
}
const speedSchema = z.object({ seconds: z.number().nonnegative().nullable(), performance: z.number().min(0).max(1).nullable() });
export const searchSchema = z.object({ query: z.string().max(600), status: z.enum(["completed", "unavailable"]), position: z.number().int().min(1).max(10).nullable(), competitors: z.array(organicSchema.extend({ speed: speedSchema, comparison: z.string().max(1200) })).max(3) });
export const reportSchema = z.object({ offering: z.string().max(150).optional(), city: z.string().max(150).optional(), version: z.literal(1), business: z.string().max(150), website: z.string().max(2000).nullable(), location: z.string().max(400), checked_at: z.string(), searches: z.array(searchSchema).max(5), speed: speedSchema, maps: z.object({ status: z.enum(["matched", "not found", "unavailable", "unconfirmed"]), rating: z.number().min(0).max(5).nullable(), reviews: z.number().int().nonnegative().nullable() }), score: z.object({ earned: z.number().min(0).max(100), coverage: z.number().min(0).max(100), complete: z.boolean() }), fixes: z.array(z.string().max(600)).max(3) });
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
export function reportFixes(searches: GoogleReport["searches"], speed: GoogleReport["speed"], page: Record<string, unknown>): string[] {
  const fixes: string[] = [];
  if (searches.slice(0, 4).some(s => s.status === "completed" && (s.position === null || s.position > 3))) fixes.push("Build clear pages for your main offering and location so customers can find you on Google.");
  if (speed.seconds !== null && speed.seconds >= 1.8) fixes.push("Make your mobile website load faster so visitors can reach your offer sooner.");
  if (page['status'] === "completed") {
    if (!page['contact_or_action_present']) fixes.push("Make a call, WhatsApp or enquiry button easy to find.");
    if (!page['main_headline']) fixes.push("Add a clear headline explaining what your business offers.");
    if (!page['uses_https']) fixes.push("Secure your website connection to help visitors feel confident.");
  }
  return fixes.slice(0, 3);
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
