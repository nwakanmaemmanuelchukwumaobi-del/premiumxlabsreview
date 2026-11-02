import { describe, expect, it } from "vitest";
import { AD_PLATFORMS, AUDIT_GOALS, ONLINE_PLATFORMS, SOCIAL_PLATFORMS, SOCIAL_FIELD_NAMES, auditSchema, hasAdHistory } from "@/lib/audit-fields";

const base = { name: "Test", business_name: "Test business", email: "test@example.com", whatsapp: "+2349034340796", industry_location: "Retail, Abuja", challenge: "Low sales", running_ads: "Used to", report_preference: "Email" };

describe("Audit answers", () => {
  it.each([{}, { instagram: "", facebook: " ", tiktok: "", x: "", linkedin: " " }])("allows unselected or blank social platforms: %j", fields => {
    const parsed = auditSchema.parse({ ...base, ...fields });
    expect([parsed.instagram, parsed.facebook, parsed.tiktok, parsed.x, parsed.linkedin]).toEqual([null, null, null, null, null]);
  });
  it("keeps each platform's link separate and accepts handles", () => {
    const parsed = auditSchema.parse({ ...base, instagram: " @shop ", facebook: " facebook.com/shop ", tiktok: " @shopvideos ", x: " @shopupdates ", linkedin: " linkedin.com/company/shop " });
    expect(parsed).toMatchObject({ instagram: "@shop", facebook: "facebook.com/shop", tiktok: "@shopvideos", x: "@shopupdates", linkedin: "linkedin.com/company/shop", website: null, social_media: null });
    expect(auditSchema.parse(parsed)).toEqual(parsed);
  });
  it("offers exactly five platforms and maps X to its separate x field", () => {
    expect(SOCIAL_PLATFORMS).toEqual(["Instagram", "Facebook", "TikTok", "X (Twitter)", "LinkedIn"]);
    expect(SOCIAL_FIELD_NAMES["X (Twitter)"]).toBe("x");
    expect(SOCIAL_FIELD_NAMES.LinkedIn).toBe("linkedin");
  });
  it("normalizes legacy X and LinkedIn links without losing them", () => {
    const parsed = auditSchema.parse({ ...base, online_links: [{ platform: "X (Twitter)", link: "@oldshop" }, { platform: "LinkedIn", link: "linkedin.com/company/oldshop" }] });
    expect(parsed.x).toBe("@oldshop");
    expect(parsed.linkedin).toBe("linkedin.com/company/oldshop");
  });
  it.each([{}, { website: "", social_media: "", profile_screenshots: [] }])("allows all three online fields to be empty: %j", fields => {
    const parsed = auditSchema.parse({ ...base, ...fields });
    expect(parsed.website).toBeNull();
    expect(parsed.social_media).toBeNull();
    expect(parsed.profile_screenshots).toEqual([]);
    expect(auditSchema.parse(parsed)).toEqual(parsed);
  });
  it("keeps optional website and social media separate without requiring a URL", () => {
    const parsed = auditSchema.parse({ ...base, website: " www.yourbusiness.com ", social_media: " @yourbusiness " });
    expect(parsed.website).toBe("www.yourbusiness.com");
    expect(parsed.social_media).toBe("@yourbusiness");
    expect(parsed.online_links).toEqual([]);
  });
  it("can validate client-normalized optional answers again on the server", () => {
    const client = auditSchema.parse({ ...base, goals: ["Increase sales"], ad_platforms: ["Google Ads"] });
    expect(auditSchema.parse(client)).toEqual(client);
    expect(client.online_links).toEqual([]);
  });
  it.each(["Yes and getting results", "Yes but not getting results", "Used to"])("shows ad follow-ups for %s", (answer) => {
    expect(hasAdHistory(answer)).toBe(true);
  });
  it("hides follow-ups for No, never", () => {
    expect(hasAdHistory("No, never")).toBe(false);
  });
  it("saves multiple goals and custom Other goal", () => {
    const result = auditSchema.parse({ ...base, goals: ["Generate more leads", "Increase sales", "Other"], goals_other: "  Sell abroad  " });
    expect(result.goals).toEqual(["Generate more leads", "Increase sales", "Other"]);
    expect(result.goals_other).toBe("Sell abroad");
  });
  it("saves multiple platforms and custom Other platform", () => {
    const result = auditSchema.parse({ ...base, ad_platforms: ["Facebook / Instagram (Meta)", "Google Ads", "Other"], ad_platform_other: "Radio sponsorship", ad_spend: "₦150,000" });
    expect(result.ad_platforms).toEqual(["Facebook / Instagram (Meta)", "Google Ads", "Other"]);
    expect(result.ad_platform_other).toBe("Radio sponsorship");
    expect(result.ad_spend).toBe("₦150,000");
  });
  it("accepts every requested choice", () => {
    const result = auditSchema.parse({ ...base, goals: [...AUDIT_GOALS], goals_other: "Custom goal", ad_platforms: [...AD_PLATFORMS], ad_platform_other: "Custom platform" });
    expect(result.goals).toHaveLength(11);
    expect(result.ad_platforms).toHaveLength(9);
  });
  it.each(["goals", "ad_platforms"])("requires custom text for Other in %s", (field) => {
    expect(auditSchema.safeParse({ ...base, [field]: ["Other"] }).success).toBe(false);
  });
  it("discards hidden ad details when No, never is chosen", () => {
    const result = auditSchema.parse({ ...base, running_ads: "No, never", ad_platforms: ["Other"], ad_platform_other: "Radio", ad_spend: "₦150,000", screenshot: { name: "test.png", type: "image/png", base64: "abc" } });
    expect(result.ad_platforms).toEqual([]);
    expect(result.ad_platform_other).toBeNull();
    expect(result.ad_spend).toBeNull();
    expect(result.screenshot).toBeUndefined();
  });
  it("discards Other text when Other is deselected", () => {
    const result = auditSchema.parse({ ...base, goals: ["Increase sales"], goals_other: "Old goal", ad_platforms: ["Google Ads"], ad_platform_other: "Old platform" });
    expect(result.goals_other).toBeNull();
    expect(result.ad_platform_other).toBeNull();
  });
  it("rejects unsupported choices", () => {
    expect(auditSchema.safeParse({ ...base, goals: ["Unsupported"] }).success).toBe(false);
    expect(auditSchema.safeParse({ ...base, ad_platforms: ["Unsupported"] }).success).toBe(false);
  });
  it("saves each online link separately and accepts handles", () => {
    const result = auditSchema.parse({ ...base, online_links: [
      { platform: "Website", link: " https://example.com " },
      { platform: "Instagram", link: " @testbusiness " },
      { platform: "Other", link: "https://pinterest.com/testbusiness", other_name: " Pinterest " },
    ] });
    expect(result.online_links).toEqual([
      { platform: "Website", link: "https://example.com", other_name: null, screenshots: [] },
      { platform: "Instagram", link: "@testbusiness", other_name: null, screenshots: [] },
      { platform: "Other", link: "https://pinterest.com/testbusiness", other_name: "Pinterest", screenshots: [] },
    ]);
    expect(auditSchema.parse(result).online_links).toEqual(result.online_links);
  });
  it("accepts all ten requested online platforms", () => {
    const result = auditSchema.parse({ ...base, online_links: ONLINE_PLATFORMS.map((platform) => ({ platform, link: "https://example.com", other_name: "Custom" })) });
    expect(result.online_links.map((entry) => entry.platform)).toEqual(["Website", "Instagram", "Facebook", "TikTok", "X (Twitter)", "YouTube", "LinkedIn", "Snapchat", "Google Business Profile", "Other"]);
  });
  it("requires both name and link for Other", () => {
    expect(auditSchema.safeParse({ ...base, online_links: [{ platform: "Other", link: "https://example.com" }] }).success).toBe(false);
    expect(auditSchema.safeParse({ ...base, online_links: [{ platform: "Other", other_name: "Pinterest", link: " " }] }).success).toBe(false);
  });
  it("rejects unsupported or repeated platforms", () => {
    expect(auditSchema.safeParse({ ...base, online_links: [{ platform: "Unknown", link: "@test" }] }).success).toBe(false);
    expect(auditSchema.safeParse({ ...base, online_links: [{ platform: "Website", link: "https://example.com" }, { platform: "Website", link: "https://example.org" }] }).success).toBe(false);
  });
  it("defaults WhatsApp consent to false when the checkbox is untouched", () => {
    expect(auditSchema.parse(base).whatsapp_consent).toBe(false);
  });
  it("keeps WhatsApp consent only when explicitly checked", () => {
    expect(auditSchema.parse({ ...base, whatsapp_consent: true }).whatsapp_consent).toBe(true);
    expect(auditSchema.safeParse({ ...base, whatsapp_consent: "yes" }).success).toBe(false);
  });
});