import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { auditSchema } from "./audit-fields";
import { auditQueries, calculateScore, competitorPool, eligibleCompetitors, websiteHealth, reportFixes, reportSchema, sameDomain, websiteDomain, organicSchema, type GoogleReport, type SearchContext } from "./google-audit";
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
  return cachedAuditCheck(`website:v5:${home}`, checksSchema, () => runWebsiteChecks(home, key, fetch, { page: 8000, speed: 20000 }), () => unavailableChecks(home), value => value.page['status'] === "completed" && value.pagespeed['status'] === "completed");
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
  return match ? { status: "matched", rating: match.rating ?? null, reviews: match.ratingCount ?? null } : { status: "unconfirmed", rating: null, reviews: null };
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
export async function generateGoogleReport(context: SearchContext, website: string | null, initial: WebsiteChecks, progress?: (report: GoogleReport, steps: number[]) => Promise<void>, clientWork?: () => Promise<WebsiteChecks>): Promise<GoogleReport> {
  const domain = websiteDomain(website);
  let checks = initial;
  const report = partialReport(context, website, checks);
  report.offering = context.main_offering; report.city = context.city;
  const done = new Set<number>();
  const publish = async (step: number) => {
    done.add(step); report.speed = speed(checks);
    report.score = calculateScore(report.searches, report.speed.performance, report.maps.rating);
    const rival = (report.speed_competitors ?? []).filter(c => c.speed.seconds !== null).sort((a, b) => (a.speed.seconds ?? 0) - (b.speed.seconds ?? 0))[0];
    report.fixes = reportFixes(report.searches, report.speed, checks.page, { offering: context.main_offering, city: context.city, competitorSpeed: rival ? { name: websiteDomain(rival.link) ?? rival.title, seconds: rival.speed.seconds as number } : null });
    const health = websiteHealth(checks.page, checks.pagespeed, context.main_offering, context.city);
    if (health) report.health = health; else delete report.health;
    if (progress) await progress(reportSchema.parse(report), [...done]);
  };
  // All six search-provider calls start together, without waiting for AI or PageSpeed.
  const mapsPromise = serperRequest("maps", `${context.business_name} ${context.city} ${context.state}`.replace(/\bnigeria\b/gi, "")).then(raw => matchedMaps(raw, context, domain)).catch(() => ({ status: "unavailable" as const, rating: null, reviews: null }));
  const searches: GoogleReport["searches"] = await Promise.all(auditQueries(context).map(async query => {
    try {
      const parsed = await cachedAuditCheck(`search:v3:${query}:${domain}`, providerSearch.nullable(), () => serperRequest("search", query).then(v => providerSearch.parse(v)), () => null, value => value !== null);
      if (!parsed) return { query, status: "unavailable" as const, position: null, competitors: [] };
      const results = parsed.organic.flatMap(r => { const p = organicSchema.safeParse(r); return p.success ? [p.data] : []; }).sort((a,b) => a.position-b.position).slice(0,10);
      return { query, status: "completed" as const, position: results.find(r => sameDomain(r.link, domain))?.position ?? null, competitors: eligibleCompetitors(results, domain).map(r => ({ ...r, speed: { seconds: null, performance: null }, comparison: "" })) };
    } catch { return { query, status: "unavailable" as const, position: null, competitors: [] }; }
  }));
  report.searches = searches; await publish(0);
  // Measure the first search's top real competitors, topping up from other searches so "You" is never shown alone.
  const pool = [...(searches[0]?.competitors ?? []), ...competitorPool(searches)].filter((c, i, all) => all.findIndex(o => websiteDomain(o.link) === websiteDomain(c.link)) === i).slice(0, 4);
  const clientResult = (clientWork ? clientWork() : Promise.resolve(checks)).then(async value => { checks = value; await publish(1); return value; });
  const [, ...measured] = await Promise.all([clientResult, ...pool.map(c => cachedWebsiteChecks(c.link, process.env['PAGESPEED_API_KEY']).catch(() => null))]);
  const timed = pool.map((c, i) => ({ c, checked: measured[i] ?? null })).map(x => ({ ...x, speed: x.checked ? speed(x.checked) : { seconds: null, performance: null } }));
  const chosen = [...timed.filter(x => x.speed.seconds !== null), ...timed.filter(x => x.speed.seconds === null)].slice(0, 2);
  report.speed_competitors = chosen.map(x => ({ title: x.c.title, link: x.c.link, speed: x.speed }));
  const mineSeconds = speed(checks).seconds;
  for (const { c, checked, speed: theirs } of chosen) {
    const target = searches[0]?.competitors.find(o => o.link === c.link); if (!target) continue;
    target.speed = theirs;
    const mine = pageEvidence(checks.page), other = checked ? pageEvidence(checked.page) : null;
    if (other && mine.available && other.available) {
      if (other.contact && !mine.contact) target.comparison = "A direct contact button makes it easier to enquire.";
      else if (other.links.length && !mine.links.length) target.comparison = "Dedicated offering pages give customers a clearer next step.";
    }
    if (theirs.seconds !== null && mineSeconds !== null && theirs.seconds < mineSeconds) target.comparison = "Their homepage loads faster on a phone.";
  }
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