// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { inspectHTML, isPublicAddress, publicWebsiteURL, runWebsiteChecks, saveThenCheck } from "@/lib/website-checks.server";

describe("Post-save audit website checks", () => {
  it("records no website without calling any external service", async () => {
    const request = vi.fn();
    const result = await runWebsiteChecks(undefined, undefined, request);
    expect(result.status).toBe("no website");
    expect(result.page).toEqual({ status: "skipped", reason: "no website" });
    expect(request).not.toHaveBeenCalled();
  });
  it("extracts HTTPS, title, description, H1, phone, WhatsApp, contact and social links", () => {
    const result = inspectHTML('<title>Shop &amp; Co</title><meta name="description" content="Abuja shop"><h1>Our products</h1><a href="tel:+2341234567">Call</a><a href="https://wa.me/2341234567">Chat</a><button>Contact us</button><a href="https://instagram.com/shop">Instagram</a>', "https://shop.com/", "http://shop.com/");
    expect(result.title).toBe("Shop & Co");
    expect(result.meta_description).toBe("Abuja shop");
    expect(result.main_headline).toBe("Our products");
    expect(result.submitted_uses_https).toBe(false);
    expect(result.uses_https).toBe(true);
    expect(result.contact_or_action_evidence.map((e) => e.type)).toEqual(["phone", "WhatsApp", "contact/action"]);
    expect(result.social_links).toEqual([{ platform: "instagram.com", url: "https://instagram.com/shop" }]);
  });
  it("records missing page signals instead of inventing them", () => {
    const result = inspectHTML("<p>Nothing here</p>", "https://shop.com", "https://shop.com");
    expect(result.title).toBeNull();
    expect(result.meta_description).toBeNull();
    expect(result.main_headline).toBeNull();
    expect(result.contact_or_action_present).toBe(false);
    expect(result.social_links_present).toBe(false);
  });
  it.each(["http://127.0.0.1", "http://169.254.169.254", "http://[::1]", "http://localhost", "https://foo.internal", "file:///etc/passwd", "https://user:pass@shop.com", "https://shop.com:8080"])("blocks unsafe destination %s", (url) => {
    expect(() => publicWebsiteURL(url)).toThrow();
  });
  it("rejects private DNS addresses", () => {
    for (const ip of ["10.0.0.1", "127.0.0.1", "172.16.2.1", "192.168.1.1", "169.254.169.254", "::1", "fc00::1", "::ffff:127.0.0.1"]) expect(isPublicAddress(ip)).toBe(false);
    expect(isPublicAddress("8.8.8.8")).toBe(true);
  });
  it("uses mobile PageSpeed and continues when website fetch fails", async () => {
    const request = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === "www.googleapis.com") {
        expect(url.searchParams.get("strategy")).toBe("mobile");
        expect(url.searchParams.get("url")).toBe("https://shop.com/");
        return Response.json({ lighthouseResult: { categories: { performance: { score: 0.72 } }, audits: { "largest-contentful-paint": { numericValue: 2800 } } } });
      }
      throw new Error("Network failure");
    });
    const result = await runWebsiteChecks("shop.com", "test-credential", request);
    expect(result.page['status']).toBe("skipped");
    expect(result.pagespeed['performance_score']).toBe(0.72);
    expect(result.pagespeed['metrics']).toMatchObject({ "largest-contentful-paint": { numericValue: 2800 } });
  });
  it("skips a missing key but still checks page HTML", async () => {
    const request = vi.fn(async (input: RequestInfo | URL) => {
      if (new URL(String(input)).hostname === "cloudflare-dns.com") return Response.json({ Status: 0, Answer: [{ type: 1, data: "8.8.8.8" }] });
      return new Response("<title>Business</title>", { headers: { "content-type": "text/html" } });
    });
    const result = await runWebsiteChecks("https://shop.com", undefined, request);
    expect(result.page['title']).toBe("Business");
    expect(result.pagespeed['reason']).toBe("PAGESPEED_API_KEY is not configured");
  });
  it("blocks private DNS and unsafe redirect destinations", async () => {
    const privateDNS = vi.fn(async () => Response.json({ Status: 0, Answer: [{ type: 1, data: "10.0.0.1" }] }));
    const privateResult = await runWebsiteChecks("https://shop.com", undefined, privateDNS);
    expect(privateResult.page['status']).toBe("skipped");
    expect(privateDNS).toHaveBeenCalledTimes(2);
    const redirect = vi.fn(async (input: RequestInfo | URL) => {
      if (new URL(String(input)).hostname === "cloudflare-dns.com") return Response.json({ Status: 0, Answer: [{ type: 1, data: "8.8.8.8" }] });
      return new Response(null, { status: 302, headers: { location: "http://127.0.0.1" } });
    });
    const result = await runWebsiteChecks("https://shop.com", undefined, redirect);
    expect(result.page['status']).toBe("skipped");
    expect(redirect).toHaveBeenCalledTimes(3);
  });
  it("saves before checking and preserves success even if checks and result storage fail", async () => {
    const order: string[] = [];
    const result = await saveThenCheck(async () => { order.push("save"); return "saved-id"; }, async () => { order.push("check"); throw new Error("failed"); }, async (id) => { expect(id).toBe("saved-id"); order.push("persist"); throw new Error("failed"); });
    expect(order).toEqual(["save", "check", "persist"]);
    expect(result.status).toBe("skipped");
    expect(result.storage).toBe("Request saved; results could not be stored.");
  });
  it("does not run checks when the database save fails", async () => {
    const check = vi.fn();
    await expect(saveThenCheck(async () => { throw new Error("save failed"); }, check, vi.fn())).rejects.toThrow("save failed");
    expect(check).not.toHaveBeenCalled();
  });
});