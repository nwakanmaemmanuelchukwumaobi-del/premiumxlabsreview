import { describe, expect, it } from "vitest";
import { auditSchema } from "@/lib/audit-fields";
import { auditQueries, calculateScore, eligibleCompetitors, isFreshCache, normalizeState, reportSchema, sameDomain, type GoogleReport } from "@/lib/google-audit";

const base = { business_name: "Ada Store", main_offering: "shoes", city: "Wuse", state: "FCT" };
const searches = (positions: (number | null)[]): GoogleReport["searches"] => positions.map(position => ({ query: "shoes Abuja", status: "completed", position, competitors: [] }));
describe("Google audit business rules", () => {
  it("runs exactly the five product queries with Abuja for FCT", () => { expect(auditQueries({ ...base, offering_type: "Products" }, "sandals")).toEqual(["shoes Wuse", "shoes Abuja", "buy shoes Abuja", "sandals Wuse", "Ada Store"]); });
  it("runs exactly the five service queries", () => { expect(auditQueries({ ...base, main_offering: "plumbing", offering_type: "Services" }, "repairs")).toEqual(["plumbing Wuse", "plumbing company Wuse", "best plumbing Wuse", "repairs Abuja", "Ada Store"]); });
  it("mixes main product and main service for Both", () => { expect(auditQueries({ ...base, offering_type: "Both", main_service: "shoe repairs" })).toEqual(["shoes Wuse", "buy shoes Abuja", "shoe repairs Wuse", "shoe repairs company Abuja", "Ada Store"]); });
  it("uses a main-offering variation when no secondary exists", () => { expect(auditQueries({ ...base, offering_type: "Products" })[3]).toBe("shoes options Wuse"); });
  it("never includes the word Nigeria in query text", () => { expect(auditQueries({ ...base, main_offering: "shoes Nigeria", business_name: "Ada Nigeria Store", offering_type: "Products" }).some(q => /\bnigeria\b/i.test(q))).toBe(false); });
  it("uses 50 Google points at first place, 30 speed points, and 20 name/rating points", () => { expect(calculateScore(searches([1, 1, 1, 1, 1]), 1, 5)).toEqual({ earned: 100, coverage: 100, complete: true }); });
  it("calculates position-four visibility and rounds once", () => { expect(calculateScore(searches([4, 4, 4, 4, 4]), 0.5, 4)).toEqual({ earned: 65, coverage: 100, complete: true }); });
  it("scores successful page-one absences as zero", () => { expect(calculateScore(searches([null, null, null, null, null]), 0, 0)).toEqual({ earned: 0, coverage: 100, complete: true }); });
  it("does not count missing speed/rating as scored checks", () => { expect(calculateScore(searches([1, 1, 1, 1, 1]), null, null)).toEqual({ earned: 60, coverage: 60, complete: false }); });
  it("does not extrapolate unavailable search points", () => { const s = searches([1, 1, 1, 1, 1]); const first = s[0]; if (!first) throw new Error("fixture"); first.status = "unavailable"; expect(calculateScore(s, null, null)).toEqual({ earned: 48, coverage: 47.5, complete: false }); });
  it("matches exact client domains and subdomains, not lookalikes", () => { expect(sameDomain("https://www.shop.ng/about", "shop.ng")).toBe(true); expect(sameDomain("https://offers.shop.ng", "shop.ng")).toBe(true); expect(sameDomain("https://shop.ng.attacker.com", "shop.ng")).toBe(false); });
  it("excludes directories, marketplaces, social pages, duplicates and client", () => {
    const entries = [{ title: "Client", link: "https://shop.ng", position: 1 }, { title: "Directory", link: "https://finelib.com/a", position: 2 }, { title: "Shoes", link: "https://jiji.ng", position: 3 }, { title: "Social", link: "https://instagram.com/shop", position: 4 }, { title: "Store A", link: "https://storea.ng", position: 5 }, { title: "Store A again", link: "https://storea.ng/shop", position: 6 }, { title: "Store B", link: "https://storeb.ng", position: 7 }, { title: "Store C", link: "https://storec.ng", position: 8 }, { title: "Store D", link: "https://stored.ng", position: 9 }];
    expect(eligibleCompetitors(entries, "shop.ng").map(r => r.position)).toEqual([5, 7, 8]);
  });
  it("excludes infoisinfo and OrderNow and advances to real businesses", () => { expect(eligibleCompetitors([{ title: "Shoes", link: "https://ng.infoisinfo.com", position: 1 }, { title: "Shoes", link: "https://ordernow.ng", position: 2 }, { title: "Real store", link: "https://realstore.ng", position: 3 }], null).map(r => r.link)).toEqual(["https://realstore.ng"]); });
  it("expires cache exactly after 24 hours", () => { const now = Date.parse("2026-11-04T12:00:00Z"); const expiry = new Date(now + 24 * 3600000).toISOString(); expect(isFreshCache(expiry, now + 24 * 3600000 - 1)).toBe(true); expect(isFreshCache(expiry, now + 24 * 3600000)).toBe(false); });
  it("normalizes FCT and requires separate product and service for Both", () => {
    expect(normalizeState("Federal Capital Territory")).toBe("Abuja");
    const a = { name: "Ada", business_name: "Ada Store", email: "ada@example.com", whatsapp: "09012345678", industry_location: "Retail, Abuja", challenge: "Low sales", running_ads: "No, never", report_preference: "Email", offering_type: "Both", main_offering: "shoes", city: "Wuse", state: "FCT" };
    expect(auditSchema.safeParse(a).success).toBe(false);
    expect(auditSchema.parse({ ...a, main_service: "repairs" }).state).toBe("Abuja");
  });
  it("keeps website, all socials and profile images optional on upgraded forms", () => { const a = auditSchema.parse({ name: "Ada", business_name: "Ada", email: "a@example.com", whatsapp: "09012345678", industry_location: "Retail", challenge: "Low sales", running_ads: "No, never", report_preference: "Email", offering_type: "Products", main_offering: "shoes", city: "Abuja", state: "Abuja" }); expect(a.website).toBeNull(); expect(a.instagram).toBeNull(); expect(a.profile_screenshots).toEqual([]); });
  it("strips contact details and screenshots from shared reports", () => { const parsed = reportSchema.parse({ version: 1, business: "Ada Store", website: null, location: "Abuja", checked_at: "2026-11-04", searches: [], speed: { seconds: null, performance: null }, maps: { status: "unavailable", rating: null, reviews: null }, score: { earned: 0, coverage: 0, complete: false }, fixes: [], email: "private@example.com", whatsapp: "2349012345678", profile_screenshots: ["private/path"] }); expect(parsed).not.toHaveProperty("email"); expect(parsed).not.toHaveProperty("whatsapp"); expect(parsed).not.toHaveProperty("profile_screenshots"); });
});