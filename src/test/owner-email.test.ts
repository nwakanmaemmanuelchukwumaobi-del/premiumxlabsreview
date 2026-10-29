import { afterEach, describe, expect, it, vi } from "vitest";
import { auditSchema } from "@/lib/audit-fields";
import { buildAuditEmail, OWNER_EMAIL_TO, sendAuditOwnerEmail } from "@/lib/owner-email.server";

const answers = auditSchema.parse({
  name: "Ada Example", business_name: "Example Studio", email: "visitor@example.com", whatsapp: "+2348000000000",
  industry_location: "Design, Abuja", challenge: "Low sales", running_ads: "Used to", ad_spend: "NGN 45000",
  ad_platforms: ["Google Ads", "Other"], ad_platform_other: "Local publisher", goals: ["Increase sales", "Other"], goals_other: "Repeat customers",
  report_preference: "Email", online_links: [{ platform: "Website", link: "https://example.com" }, { platform: "Instagram", link: "@example" }, { platform: "Other", other_name: "Directory", link: "https://example.org" }],
  screenshot: { name: "ad-results.png", type: "image/png", base64: "aGVsbG8=" },
});
const breakdown = { problems: ["Customers cannot find a contact option."], closing: "Your full audit is being prepared." };
const date = new Date("2026-10-29T04:56:00Z");
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("Audit owner notifications", () => {
  it("sends to the explicitly confirmed address", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only-not-a-credential");
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    vi.spyOn(console, "info").mockImplementation(() => {});
    expect(OWNER_EMAIL_TO).toBe("hello@premuimxlabs.com");
    expect(await sendAuditOwnerEmail(answers, breakdown, {}, "audit-id", date)).toBe(true);
    const sent = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(sent.to).toEqual(["hello@premuimxlabs.com"]);
  });
  it("uses the exact requested subject", () => {
    expect(buildAuditEmail(answers, null, {}, date).subject).toBe("New Audit Request: Example Studio");
  });
  it("includes every form answer, screenshot link, saved breakdown and check summary", () => {
    const email = buildAuditEmail(answers, breakdown, { status: "completed", page: { status: "completed", uses_https: true, title: "Example title" }, pagespeed: { status: "completed", metrics: { "first-contentful-paint": { numericValue: 2200 } } } }, date, "https://example.com/private-screenshot");
    for (const value of ["Ada Example", "Example Studio", "visitor@example.com", "+2348000000000", "Design, Abuja", "Low sales", "Used to", "NGN 45000", "Google Ads", "Local publisher", "Increase sales", "Repeat customers", "Email", "https://example.com", "@example", "Directory", "https://example.org", "ad-results.png", "https://example.com/private-screenshot", "29 Oct 2026", ...breakdown.problems, breakdown.closing, "Example title", "2.2s"]) expect(email.text).toContain(value);
  });
  it("sets reply-to to the visitor email", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only-not-a-credential");
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    vi.spyOn(console, "info").mockImplementation(() => {});
    await sendAuditOwnerEmail(answers, null, {}, "audit-id", date);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).reply_to).toBe("visitor@example.com");
  });
  it("never throws when Resend rejects a notification", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only-not-a-credential");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"message":"domain not verified"}', { status: 403 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendAuditOwnerEmail(answers, breakdown, {}, "saved-audit", date)).resolves.toBe(false);
    expect(breakdown.problems).toEqual(["Customers cannot find a contact option."]);
  });
  it("never throws when delivery times out", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only-not-a-credential");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendAuditOwnerEmail(answers, breakdown, {}, "saved-audit", date)).resolves.toBe(false);
  });
});