import { describe, expect, it } from "vitest";
import { AD_PLATFORMS, AUDIT_GOALS, auditSchema, hasAdHistory } from "@/lib/audit-fields";

const base = { name: "Test", business_name: "Test business", email: "test@example.com", whatsapp: "+2349034340796", industry_location: "Retail, Abuja", challenge: "Low sales", running_ads: "Used to", report_preference: "Email" };

describe("Audit answers", () => {
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
});