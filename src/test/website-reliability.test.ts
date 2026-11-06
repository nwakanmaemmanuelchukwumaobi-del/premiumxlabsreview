// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { runMobilePerformance, runWebsiteChecks } from "@/lib/website-checks.server";

afterEach(() => { vi.restoreAllMocks(); });
describe("Independent website checks", () => {
  it("requests performance first and preserves it after two failed SEO runs", async () => {
    const categories: string[][] = [];
    const timeouts: number[] = [];
    const realTimeout = AbortSignal.timeout.bind(AbortSignal);
    vi.spyOn(AbortSignal, "timeout").mockImplementation(ms => { timeouts.push(ms); return realTimeout(ms); });
    const request = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === "cloudflare-dns.com") return Response.json({ Status: 0, Answer: [{ type: 1, data: "8.8.8.8" }] });
      if (url.hostname !== "www.googleapis.com") return new Response("<title>Furniture Abuja</title>", { headers: { "content-type": "text/html" } });
      const category = url.searchParams.getAll("category"); categories.push(category);
      return category[0] === "performance" ? Response.json({ lighthouseResult: { categories: { performance: { score: 0.8 } }, audits: { "first-contentful-paint": { numericValue: 2200 } } } }) : Response.json({ error: { status: "RESOURCE_EXHAUSTED" } }, { status: 429 });
    });
    const checks = await runWebsiteChecks("shop.com", "test-only", request);
    expect(categories).toEqual([["performance"], ["seo"], ["seo"]]);
    expect(checks.pagespeed['status']).toBe("completed");
    expect(checks.pagespeed['performance_score']).toBe(0.8);
    expect(checks.pagespeed['metrics']).toMatchObject({ "first-contentful-paint": { numericValue: 2200 } });
    expect(timeouts.filter(ms => ms === 30000)).toHaveLength(3);
  });
  it("retries a failed performance run once and a failed homepage once", async () => {
    let pages = 0, performance = 0;
    const request = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === "cloudflare-dns.com") return Response.json({ Status: 0, Answer: [{ type: 1, data: "8.8.8.8" }] });
      if (url.hostname !== "www.googleapis.com") { if (++pages === 1) return new Response(null, { status: 503 }); return new Response("<h1>Furniture Abuja</h1>", { headers: { "content-type": "text/html" } }); }
      if (url.searchParams.get("category") === "performance" && ++performance === 1) throw new DOMException("Timed out", "TimeoutError");
      const category = url.searchParams.get("category") ?? "";
      return Response.json({ lighthouseResult: { categories: { [category]: { score: 0.9 } }, audits: { "first-contentful-paint": { numericValue: 1000 } } } });
    });
    const checks = await runWebsiteChecks("shop.com", "test-only", request);
    expect(performance).toBe(2); expect(pages).toBe(2);
    expect(checks.pagespeed['performance_score']).toBe(0.9);
    expect(checks.pagespeed['seo_score']).toBe(0.9);
    expect(checks.page['status']).toBe("completed");
  });
});
it("uses only mobile performance, one attempt and an eight-second timeout", async () => {
  const timeout = vi.spyOn(AbortSignal, "timeout");
  const request = vi.fn(async (input: RequestInfo | URL) => { const url = new URL(String(input)); expect(url.searchParams.get("strategy")).toBe("mobile"); expect(url.searchParams.getAll("category")).toEqual(["performance"]); throw new DOMException("Timed out", "TimeoutError"); });
  const result = await runMobilePerformance("https://premiumxlabs.com", "test-only", request);
  expect(request).toHaveBeenCalledOnce(); expect(timeout).toHaveBeenCalledWith(8000); expect(result).toMatchObject({ status:"skipped", reason:"timeout" });
});
