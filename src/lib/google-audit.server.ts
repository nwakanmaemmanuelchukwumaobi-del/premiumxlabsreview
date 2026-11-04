import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { auditSchema } from "./audit-fields";
import { auditQueries, calculateScore, eligibleCompetitors, reportFixes, reportSchema, sameDomain, websiteDomain, organicSchema, type GoogleReport, type SearchContext } from "./google-audit";
import { cachedAuditCheck, hashValue } from "./audit-cache.server";
import { analyzePages, pageEvidence } from "./google-audit-ai.server";
import { runWebsiteChecks, publicWebsiteURL, type WebsiteChecks } from "./website-checks.server";

const checksSchema: z.ZodType<WebsiteChecks> = z.object({ status: z.enum(["completed", "no website", "skipped"]), website: z.string().nullable(), checked_at: z.string(), page: z.record(z.string(), z.unknown()), pagespeed: z.record(z.string(), z.unknown()) });
const unavailableChecks = (website: string | null): WebsiteChecks => ({ status: website ? "skipped" : "no website", website, checked_at: new Date().toISOString(), page: { status: "skipped" }, pagespeed: { status: "skipped" } });
export async function cachedWebsiteChecks(website: string | undefined, key: string | undefined): Promise<WebsiteChecks> {
  if (!website) return runWebsiteChecks(undefined, key);
  let url: URL;
  try { url = publicWebsiteURL(website); } catch { return unavailableChecks(website); }
  const home = `${url.origin}/`;
  return cachedAuditCheck(`website:v2:${home}`, checksSchema, () => runWebsiteChecks(home, key), () => unavailableChecks(home));
}
export async function serperRequest(endpoint: "search" | "maps", query: string, request: typeof fetch = fetch): Promise<unknown> {
  const key = process.env["SERPER_API_KEY"];
  if (!key) throw new Error("Google checks unavailable");
  const response = await request(`https://google.serper.dev/${endpoint}`, { method: "POST", signal: AbortSignal.timeout(12000), headers: { "X-API-KEY": key, "Content-Type": "application/json" }, body: JSON.stringify({ q: query, gl: "ng", hl: "en", num: 10 }) });
  if (!response.ok) { console.error(`Serper ${endpoint} check failed [${response.status}].`); throw new Error("Google checks unavailable"); }
  const text = await response.text();
  if (text.length > 1000000) throw new Error("Search response too large");
  return JSON.parse(text);
}
const providerSearch = z.object({ organic: z.array(z.object({ title: z.string(), link: z.string(), position: z.number().int() })) });
const placesSchema = z.object({ places: z.array(z.object({ title: z.string(), address: z.string().optional(), website: z.string().optional(), rating: z.number().min(0).max(5).optional(), ratingCount: z.number().int().nonnegative().optional() })) });
export function matchedMaps(raw: unknown, context: SearchContext, domain: string | null): GoogleReport["maps"] {
  const data = placesSchema.safeParse(raw);
  if (!data.success) return { status: "unavailable", rating: null, reviews: null };
  const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const match = data.data.places.find(p => normalize(p.title) === normalize(context.business_name) && !!p.address && [context.city, context.state].some(l => p.address?.toLowerCase().includes(l.toLowerCase())) && !!domain && !!p.website && sameDomain(p.website, domain));
  return match ? { status: "matched", rating: match.rating ?? null, reviews: match.ratingCount ?? null } : { status: data.data.places.length ? "unconfirmed" : "not found", rating: null, reviews: null };
}
const speed = (checks: WebsiteChecks): GoogleReport["speed"] => {
  const ps = checks.pagespeed;
  const metrics = z.object({ "first-contentful-paint": z.object({ numericValue: z.number().nonnegative() }) }).safeParse(ps['metrics']);
  return { seconds: ps['status'] === "completed" && metrics.success ? metrics.data["first-contentful-paint"].numericValue / 1000 : null, performance: ps['status'] === "completed" && typeof ps['performance_score'] === "number" ? Math.max(0, Math.min(1, ps['performance_score'])) : null };
};
export function partialReport(context: SearchContext, website: string | null, checks: WebsiteChecks): GoogleReport {
  const searches: GoogleReport["searches"] = auditQueries(context).map(query => ({ query, status: "unavailable", position: null, competitors: [] }));
  const clientSpeed = speed(checks);
  return { version: 1, business: context.business_name, website, location: `${context.city}, ${context.state}`, checked_at: new Date().toISOString(), searches, speed: clientSpeed, maps: { status: "unavailable", rating: null, reviews: null }, score: calculateScore(searches, clientSpeed.performance, null), fixes: reportFixes(searches, clientSpeed, checks.page) };
}
export async function generateGoogleReport(context: SearchContext, website: string | null, checks: WebsiteChecks): Promise<GoogleReport> {
  const domain = websiteDomain(checks.website ?? website);
  return cachedAuditCheck(`google:v1:${domain ?? "no-website"}:${JSON.stringify(context)}`, reportSchema, async () => {
    const clientEvidence = pageEvidence(checks.page);
    const secondary = await analyzePages(context.main_offering, clientEvidence);
    const queries = auditQueries(context, secondary.secondary);
    const searches: GoogleReport["searches"] = await Promise.all(queries.map(async query => {
      try {
        const parsed = providerSearch.parse(await serperRequest("search", query));
        const results = parsed.organic.flatMap(r => { const p = organicSchema.safeParse(r); return p.success ? [p.data] : []; }).sort((a, b) => a.position - b.position).slice(0, 10);
        return { query, status: "completed" as const, position: results.find(r => sameDomain(r.link, domain))?.position ?? null, competitors: eligibleCompetitors(results, domain).map(r => ({ ...r, speed: { seconds: null, performance: null }, comparison: "" })) };
      } catch { return { query, status: "unavailable" as const, position: null, competitors: [] }; }
    }));
    const maps = await serperRequest("maps", `${context.business_name} ${context.city} ${context.state}`.replace(/\bnigeria\b/gi, "").replace(/\s+/g, " ").trim()).then(raw => matchedMaps(raw, context, domain)).catch(() => ({ status: "unavailable" as const, rating: null, reviews: null }));
    const firstCompetitors = searches[0]?.competitors ?? [];
    const competitorChecks = await Promise.all(firstCompetitors.map(c => cachedWebsiteChecks(c.link, process.env['PAGESPEED_API_KEY'])));
    const analysis = await analyzePages(context.main_offering, clientEvidence, competitorChecks.map(c => pageEvidence(c.page)));
    const labels = { headline: "a visible opening headline", contact: "a direct contact button", quote: "an enquiry or quote form", offering_pages: "links to dedicated offering pages" };
    searches.forEach(s => s.competitors.forEach(c => {
      const i = firstCompetitors.findIndex(f => websiteDomain(f.link) === websiteDomain(c.link));
      const checked = competitorChecks[i];
      if (!checked) return;
      c.speed = speed(checked);
      const differences = [...new Set(analysis.differences.filter(d => d.competitor === i).map(d => labels[d.feature]))];
      c.comparison = differences.length ? `We found ${differences.join(" and ")} on this homepage that we didn't find on yours. These can help visitors take the next step; they don't prove why it ranks higher.` : checked.page['status'] !== "completed" || !clientEvidence.available ? "We couldn't compare both homepages. Ranking alone doesn't tell us why this site appears here." : "We didn't find a clear advantage in the homepage features checked. These checks don't establish why a site ranks higher.";
    }));
    const clientSpeed = speed(checks);
    return { version: 1, business: context.business_name, website: checks.website ?? website, location: `${context.city}, ${context.state}`, checked_at: new Date().toISOString(), searches, speed: clientSpeed, maps, score: calculateScore(searches, clientSpeed.performance, maps.rating), fixes: reportFixes(searches, clientSpeed, checks.page) };
  }, () => partialReport(context, website, checks));
}
export async function createSavedGoogleReport(id: string, answers: z.infer<typeof auditSchema>, checks: WebsiteChecks) {
  if (!answers.offering_type || !answers.main_offering || !answers.city || !answers.state) return null;
  const context: SearchContext = { business_name: answers.business_name, offering_type: answers.offering_type, main_offering: answers.main_offering, main_service: answers.main_service, city: answers.city, state: answers.state };
  let report: GoogleReport;
  try { report = await generateGoogleReport(context, answers.website, checks); } catch { report = partialReport(context, answers.website, checks); }
  const { error } = await supabaseAdmin.from("audit_requests").update({ google_report: JSON.parse(JSON.stringify(report)) }).eq("id", id);
  if (error) { console.error("Google report persistence failed."); return { report, url: null }; }
  const token = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  const { error: linkError } = await supabaseAdmin.from("audit_report_links").insert({ token_hash: await hashValue(token), audit_id: id, report: JSON.parse(JSON.stringify(report)) });
  if (linkError) { console.error("Report link could not be saved."); return { report, url: null }; }
  return { report, url: `https://premiumxlabs.com/audit/report/${token}` };
}