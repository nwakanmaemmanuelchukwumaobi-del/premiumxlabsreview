// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ website: vi.fn(), mobile: vi.fn(), analyze: vi.fn(), cache: new Map<string, unknown>(), calls: [] as string[] }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));
vi.mock("@/lib/audit-cache.server", () => ({ cachedAuditCheck: async (key: string, _schema: unknown, work: () => Promise<unknown>, fallback: () => unknown) => { if (mocks.cache.has(key)) return mocks.cache.get(key); let result; try { result = await work(); } catch { result = fallback(); } mocks.cache.set(key, result); return result; }, hashValue: async () => "hash" }));
vi.mock("@/lib/google-audit-ai.server", () => ({ analyzePages: mocks.analyze, pageEvidence: () => ({ available: false, headline: null, contact: false, quote: false, links: [] }) }));
vi.mock("@/lib/website-checks.server", () => ({ publicWebsiteURL: (v: string) => new URL(v), runWebsiteChecks: mocks.website, runMobilePerformance: mocks.mobile }));
import { partialReport, generateGoogleReport, matchedMaps, serperRequest } from "@/lib/google-audit.server";
const context = { business_name: "Ada Shop", offering_type: "Products" as const, main_offering: "shoes", city: "Abuja", state: "Abuja" };
const checks = { status: "completed" as const, website: "https://ada.ng/", checked_at: "2026-11-04", page: { status: "skipped" }, pagespeed: { status: "completed", performance_score: 0.8, metrics: { "first-contentful-paint": { numericValue: 1800 } } } };
beforeEach(() => { vi.clearAllMocks(); mocks.cache.clear(); mocks.analyze.mockResolvedValue({ secondary: null, differences: [] }); mocks.website.mockResolvedValue(checks); mocks.mobile.mockResolvedValue(checks.pagespeed); vi.stubEnv("SERPER_API_KEY", "test-only"); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("Server-only Google checks", () => {
  it("runs the client and at most three competitors in parallel", async () => {
    let active = 0, peak = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url.endsWith("maps") ? { places: [] } : { organic: [1,2,3,4].map(i => ({ title: `Shoes Store ${i}`, link: `https://store${i}.ng`, position: i })) })));
    mocks.mobile.mockImplementation(async () => { active++; peak = Math.max(peak, active); await new Promise(r => setTimeout(r, 5)); active--; return checks.pagespeed; });
    const result = await generateGoogleReport(context, "https://ada.ng", checks);
    expect(peak).toBe(4); expect(mocks.mobile).toHaveBeenCalledTimes(4); expect(result.speed.seconds).toBe(1.8); expect(result.speed_competitors).toHaveLength(3);
  });
  it("uses Serper search with ng, en and top ten settings", async () => { const request = vi.fn().mockResolvedValue(Response.json({ organic: [] })); await serperRequest("search", "shoes Abuja", request); expect(request.mock.calls[0]?.[0]).toBe("https://google.serper.dev/search"); expect(JSON.parse(request.mock.calls[0]?.[1].body)).toEqual({ q: "shoes Abuja", gl: "ng", hl: "en", num: 30 }); expect(request.mock.calls[0]?.[1].headers["X-API-KEY"]).toBe("test-only"); });
  it("runs five searches, one Maps lookup and keeps three measured competitors", async () => {
    const request = vi.fn(async (url: string) => Response.json(url.endsWith("maps") ? { places: [] } : { organic: [1, 2, 3, 4].map(i => ({ title: `Shoes Store ${i}`, link: `https://store${i}.ng/products`, position: i })) })); vi.stubGlobal("fetch", request);
    const report = await generateGoogleReport(context, "https://ada.ng", checks);
    expect(request.mock.calls.filter(c => c[0].endsWith("search"))).toHaveLength(5); expect(request.mock.calls.filter(c => c[0].endsWith("maps"))).toHaveLength(1); expect(mocks.website.mock.calls.length).toBeLessThanOrEqual(4); expect(report.speed_competitors).toHaveLength(3); expect(report.searches[0]?.competitors).toHaveLength(3);
    await generateGoogleReport(context, "https://ada.ng", checks); expect(request).toHaveBeenCalledTimes(7);
  });
  it("preserves speed and partial report when all Serper calls fail", async () => { vi.spyOn(console, "error").mockImplementation(() => {}); vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline"))); const report = await generateGoogleReport(context, "https://ada.ng", checks); expect(report.searches.every(s => s.status === "unavailable")).toBe(true); expect(report.score).toEqual({ earned: 24, coverage: 30, complete: false }); expect(report.maps.status).toBe("unavailable"); });
  it("only attributes Maps rating with matching name, location and domain", () => { const places = { places: [{ title: "Ada Shop", address: "Abuja", website: "https://ada.ng", rating: 4.5, ratingCount: 17 }] }; expect(matchedMaps(places, context, "ada.ng")).toEqual({ status: "matched", rating: 4.5, reviews: 17 }); expect(matchedMaps(places, context, "other.ng")).toEqual({ status: "unconfirmed", rating: null, reviews: null }); });
  it("does not treat malformed provider responses as successful absent rankings", async () => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "unavailable" }))); const report = await generateGoogleReport(context, "https://ada.ng", checks); expect(report.searches.every(s => s.status === "unavailable")).toBe(true); expect(report.maps.status).toBe("unavailable"); });
  it("does not inspect marketplace URLs returned by the provider", async () => { vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url.endsWith("maps") ? { places: [] } : { organic: [{ title: "Hire designers", link: "https://upwork.com/designers", position: 1 }, { title: "Designers", link: "https://fiverr.com/designers", position: 2 }] }))); const report = await generateGoogleReport(context, "https://ada.ng", checks); expect(report.searches[0]?.competitors).toEqual([]); expect(mocks.website).not.toHaveBeenCalled(); expect(mocks.mobile).toHaveBeenCalledTimes(1); });
});
describe("No-website attribution and partial results", () => {
  it.each([null, "", "invalid", "http://127.0.0.1"])("never attributes client speed or health to missing/invalid website %s", async website => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url.endsWith("maps") ? { places: [] } : { organic: [1,2,3].map(i => ({ title: "Shoes", link: `https://shoes${i}.ng`, position: i })) })));
    const report = await generateGoogleReport(context, website, checks);
    expect(report.hasWebsite).toBe(false); expect(report.website).toBeNull(); expect(report.speed.seconds).toBeNull(); expect(report.speed.performance).toBeNull(); expect(report.health).toBeUndefined();
    expect(mocks.mobile).toHaveBeenCalledTimes(3); expect(report.speed_competitors).toHaveLength(3);
    expect(report.fixes).toHaveLength(3); expect(report.fixes.every(f => f.startsWith("Build a website") && !f.includes("your site"))).toBe(true);
  });
  it("publishes pending and individual speed results before all complete", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url.endsWith("maps") ? { places: [] } : { organic: [1,2,3].map(i => ({ title: "Shoes", link: `https://shoes${i}.ng`, position: i })) })));
    const reports: any[] = []; let release: (() => void) | undefined;
    mocks.mobile.mockImplementation(async (url: string) => { if (url.includes("shoes3")) await new Promise<void>(r => { release = r; }); return checks.pagespeed; });
    const work = generateGoogleReport(context, "https://ada.ng", checks, async report => { reports.push(report); });
    for (let i=0; i<20 && !reports.some(r => r.speed.status === "completed"); i++) await new Promise(r=>setTimeout(r, 5));
    expect(reports[0].speed_competitors.every((c: any) => c.speed.status === "pending")).toBe(true);
    expect(reports.some(r => r.speed.status === "completed" && r.speed_competitors.some((c: any) => c.speed.status === "pending"))).toBe(true);
    release?.(); await work;
  });
});
