import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { auditSchema } from "./audit-fields";
import { auditQueries, calculateScore, competitorPool, eligibleCompetitors, rootDomain, websiteHealth, reportFixes, reportSchema, sameDomain, websiteDomain, organicSchema, type GoogleReport, type SearchContext } from "./google-audit";
import { cachedAuditCheck, hashValue } from "./audit-cache.server";
import { analyzePages, pageEvidence } from "./google-audit-ai.server";
import { runWebsiteChecks, runMobilePerformance, publicWebsiteURL, type WebsiteChecks } from "./website-checks.server";

const checksSchema: z.ZodType<WebsiteChecks> = z.object({ status: z.enum(["completed", "no website", "skipped"]), website: z.string().nullable(), checked_at: z.string(), page: z.record(z.string(), z.unknown()), pagespeed: z.record(z.string(), z.unknown()) });
const unavailableChecks = (website: string | null): WebsiteChecks => ({ status: website ? "skipped" : "no website", website, checked_at: new Date().toISOString(), page: { status: "skipped" }, pagespeed: { status: "skipped" } });
export async function cachedWebsiteChecks(website: string | undefined, key: string | undefined, seo = true, progress?: (checks: WebsiteChecks) => Promise<void>): Promise<WebsiteChecks> {
  if (!website) return runWebsiteChecks(undefined, key);
  let url: URL;
  try { url = publicWebsiteURL(website); } catch { return unavailableChecks(website); }
  const home = `${url.origin}/`;
  return cachedAuditCheck(`website:v6:${seo ? "client" : "competitor"}:${home}`, checksSchema, () => runWebsiteChecks(home, key, fetch, { page: 8000, performance: false, seo: false, ...(progress ? { progress } : {}) }), () => unavailableChecks(home), value => value.page['status'] === "completed" && value.pagespeed['status'] === "completed" && (!seo || value.pagespeed['seo_status'] === "completed"));
}
const mobileSchema = z.record(z.string(), z.unknown());
export async function cachedMobilePerformance(website: string): Promise<Record<string, unknown>> {
  const domain = rootDomain(website);
  if (!domain) return { status: "skipped" };
  return cachedAuditCheck(`mobile-performance:v1:${domain}`, mobileSchema, () => runMobilePerformance(website, process.env['PAGESPEED_API_KEY']), () => ({ status: "skipped" }), () => true, 7 * 24);
}
export async function serperRequest(endpoint: "search" | "maps", query: string, request: typeof fetch = fetch): Promise<unknown> {
  const key = process.env["SERPER_API_KEY"];
  if (!key) throw new Error("Google checks unavailable");
  const response = await request(`https://google.serper.dev/${endpoint}`, { method: "POST", signal: AbortSignal.timeout(12000), headers: { "X-API-KEY": key, "Content-Type": "application/json" }, body: JSON.stringify({ q: query, gl: "ng", hl: "en", num: endpoint === "search" ? 30 : 10 }) });
  if (!response.ok) { console.error(`Serper ${endpoint} check failed [${response.status}].`); throw new Error("Google checks unavailable"); }
  const text = await response.text();
  if (text.length > 1000000) throw new Error("Search response too large");
  return JSON.parse(text);
}
const providerSearch = z.object({ organic: z.array(z.object({ title: z.string(), link: z.string(), position: z.number().int(), snippet: z.string().optional() })) });
const placesSchema = z.object({ places: z.array(z.object({ title: z.string(), address: z.string().optional(), website: z.string().optional(), rating: z.number().min(0).max(5).optional(), ratingCount: z.number().int().nonnegative().optional() })) });
export function matchedMaps(raw: unknown, context: SearchContext, domain: string | null): GoogleReport["maps"] {
  const data = placesSchema.safeParse(raw);
  if (!data.success) return { status: "unavailable", rating: null, reviews: null };
  const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const match = data.data.places.find(p => normalize(p.title) === normalize(context.business_name) && !!p.address && [context.city, context.state].some(l => p.address?.toLowerCase().includes(l.toLowerCase())) && !!domain && !!p.website && sameDomain(p.website, domain));
  return match ? { status: "matched", rating: match.rating ?? null, reviews: match.ratingCount ?? null } : { status: "unconfirmed", rating: null, reviews: null };
}
const speed = (checks: WebsiteChecks): GoogleReport["speed"] => {
  const ps = checks.pagespeed;
  const metrics = z.object({ "first-contentful-paint": z.object({ numericValue: z.number().nonnegative() }) }).safeParse(ps['metrics']);
  return { seconds: ps['status'] === "completed" && metrics.success ? metrics.data["first-contentful-paint"].numericValue / 1000 : null, performance: ps['status'] === "completed" && typeof ps['performance_score'] === "number" ? Math.max(0, Math.min(1, ps['performance_score'])) : null };
};
export function partialReport(context: SearchContext, website: string | null, checks: WebsiteChecks): GoogleReport {
  const searches: GoogleReport["searches"] = auditQueries(context).map(query => ({ query, status: "unavailable", position: null, competitors: [] }));
  const hasWebsite = !!websiteDomain(website);
  const clientSpeed = hasWebsite ? { ...speed(checks), status: checks.pagespeed["status"] === "completed" ? "completed" as const : "pending" as const } : { seconds: null, performance: null, status: "unavailable" as const };
  return { version: 1, business: context.business_name, hasWebsite, website: hasWebsite ? website : null, location: `${context.city}, ${context.state}`, checked_at: new Date().toISOString(), searches, speed: clientSpeed, maps: { status: "unavailable", rating: null, reviews: null }, score: calculateScore(searches, clientSpeed.performance, null), fixes: reportFixes(searches, clientSpeed, hasWebsite ? checks.page : {}, { hasWebsite }) };
}
export async function generateGoogleReport(context: SearchContext, website: string | null, initial: WebsiteChecks, progress?: (report: GoogleReport, steps: number[]) => Promise<void>, clientWork?: (partial: (checks: WebsiteChecks) => Promise<void>) => Promise<WebsiteChecks>): Promise<GoogleReport> {
  const domain = websiteDomain(website);
  const hasWebsite = !!domain;
  let checks = hasWebsite ? initial : unavailableChecks(null);
  const report = partialReport(context, website, checks);
  report.offering = context.main_offering; report.city = context.city;
  const done = new Set<number>();
  let writeQueue = Promise.resolve();
  const publish = async (step?: number) => {
    if (step !== undefined) done.add(step);
    report.score = calculateScore(report.searches, report.speed.performance, report.maps.rating);
    const rival = (report.speed_competitors ?? []).filter(c => c.speed.seconds !== null).sort((a, b) => (a.speed.seconds ?? 0) - (b.speed.seconds ?? 0))[0];
    report.fixes = reportFixes(report.searches, report.speed, checks.page, { hasWebsite, offering: context.main_offering, city: context.city, competitorSpeed: rival ? { name: websiteDomain(rival.link) ?? rival.title, seconds: rival.speed.seconds as number } : null });
    const health = hasWebsite ? websiteHealth(checks.page, checks.pagespeed, context.main_offering, context.city) : null;
    if (health) report.health = health; else delete report.health;
    if (progress) { const snapshot = reportSchema.parse(report), steps = [...done]; writeQueue = writeQueue.then(() => progress(snapshot, steps)); await writeQueue; }
  };
  // All six search-provider calls start together, without waiting for AI or PageSpeed.
  const mapsPromise = serperRequest("maps", `${context.business_name} ${context.city} ${context.state}`.replace(/\bnigeria\b/gi, "")).then(raw => matchedMaps(raw, context, domain)).catch(() => ({ status: "unavailable" as const, rating: null, reviews: null }));
  const searches: GoogleReport["searches"] = await Promise.all(auditQueries(context).map(async query => {
    try {
      const parsed = await cachedAuditCheck(`search:v4:${query}:${domain}`, providerSearch.nullable(), () => serperRequest("search", query).then(v => providerSearch.parse(v)), () => null, value => value !== null);
      if (!parsed) return { query, status: "unavailable" as const, position: null, competitors: [] };
      const results = parsed.organic.flatMap(r => { const p = organicSchema.safeParse(r); return p.success ? [p.data] : []; }).sort((a,b) => a.position-b.position);
      return { query, status: "completed" as const, position: results.slice(0, 10).find(r => sameDomain(r.link, domain))?.position ?? null, competitors: eligibleCompetitors(results, domain, context.main_offering).map(r => ({ ...r, speed: { seconds: null, performance: null }, comparison: "" })) };
    } catch { return { query, status: "unavailable" as const, position: null, competitors: [] }; }
  }));
  // Keep all queries for scoring/fixes; phrases with fewer than two relevant businesses are omitted by the report table.
  report.searches = searches;
  const pool = competitorPool(searches).slice(0, 3);
  report.speed_competitors = pool.map(c => ({ title: c.title, link: c.link, speed: { seconds: null, performance: null, status: "pending" } }));
  await publish(0);
  const performanceWork = async (url: string) => {
    const pagespeed = await cachedMobilePerformance(url);
    return { ...speed({ ...initial, pagespeed }), status: pagespeed['status'] === "completed" ? "completed" as const : "unavailable" as const };
  };
  // At most four performance-only requests together. Homepage checks use the remaining outbound slot.
  const speedWork = Promise.all([
    ...(hasWebsite && website ? [(async () => {
      report.speed = await performanceWork(website);
      checks = { ...checks, pagespeed: { status: report.speed.status === "completed" ? "completed" : "skipped", performance_score: report.speed.performance, metrics: { "first-contentful-paint": report.speed.seconds === null ? null : { numericValue: report.speed.seconds * 1000 } } } };
      await publish();
    })()] : []),
    ...pool.map(async (c, index) => {
      const result = await performanceWork(c.link);
      const target = report.speed_competitors?.[index]; if (target) target.speed = result;
      for (const search of searches) { const entry = search.competitors.find(r => rootDomain(r.link) === rootDomain(c.link)); if (entry) entry.speed = result; }
      await publish();
    }),
  ]).then(() => publish(1));
  const pageWork = hasWebsite && clientWork ? clientWork(async partial => { checks = { ...partial, pagespeed: checks.pagespeed }; await publish(); }).then(partial => { checks = { ...partial, pagespeed: checks.pagespeed }; }) : Promise.resolve();
  await Promise.all([speedWork, pageWork]);
  report.maps = await mapsPromise;
  await publish(2);
  await publish(3);
  return reportSchema.parse(report);
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