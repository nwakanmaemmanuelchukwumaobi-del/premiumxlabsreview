import { describe, it, expect } from "vitest";
import { internationalPhone } from "@/lib/audit-phone";
import { profileScreenshotSchema, matchesImageType, SCREENSHOT_LIMIT } from "@/lib/profile-screenshots";
import { auditSchema } from "@/lib/audit-fields";
import { BREAKDOWN_END } from "@/lib/instant-breakdown";
const base = { name: "Test", business_name: "Test", email: "test@example.com", whatsapp: "+2349034340796", industry_location: "Retail, Abuja", challenge: "Low sales", running_ads: "No, never", report_preference: "Email" };
const file = { name: "profile.png", type: "image/png", base64: "iVBORw0KGgo=" };
describe("Audit phone and screenshot rules", () => {
  it("removes Nigeria's leading zero and saves the international number", () => {
    expect(internationalPhone("09034340796", "NG")).toBe("+2349034340796");
    expect(auditSchema.parse({ ...base, whatsapp: internationalPhone("09034340796", "NG") }).whatsapp).toBe("+2349034340796");
  });
  it("supports another selected country", () => { expect(internationalPhone("02079460018", "GB")).toBe("+442079460018"); });
  it.each(["", "123"]) ("rejects empty or short phone %s", number => { expect(() => internationalPhone(number)).toThrow(); expect(auditSchema.safeParse({ ...base, whatsapp: number }).success).toBe(false); });
  it("makes screenshots completely optional", () => { expect(auditSchema.parse({ ...base, online_links: [{ platform: "Instagram", link: "@test" }] }).online_links[0]?.screenshots).toEqual([]); });
  it("allows three images per social platform but not four", () => {
    const parse = (count: number) => auditSchema.safeParse({ ...base, online_links: [{ platform: "Instagram", link: "@test", screenshots: Array(count).fill(file) }] });
    expect(parse(3).success).toBe(true); expect(parse(4).success).toBe(false);
  });
  it("enforces 5 MB per image", () => {
    const encoded = (size: number) => btoa("a".repeat(size));
    expect(profileScreenshotSchema.safeParse({ ...file, base64: encoded(SCREENSHOT_LIMIT) }).success).toBe(true);
    expect(profileScreenshotSchema.safeParse({ ...file, base64: encoded(SCREENSHOT_LIMIT + 1) }).success).toBe(false);
  });
  it.each(["image/png", "image/jpeg", "image/webp"])("accepts %s", type => { expect(profileScreenshotSchema.safeParse({ ...file, type }).success).toBe(true); });
  it("rejects unsupported formats and forged image content", () => {
    expect(profileScreenshotSchema.safeParse({ ...file, type: "image/svg+xml" }).success).toBe(false);
    expect(matchesImageType(new Uint8Array([137,80,78,71,13,10,26,10]), "image/png")).toBe(true);
    expect(matchesImageType(new TextEncoder().encode("<script>"), "image/png")).toBe(false);
  });
  it("sets the full report deadline to 24 hours", () => { expect(BREAKDOWN_END).toContain("within 24 hours"); });
});