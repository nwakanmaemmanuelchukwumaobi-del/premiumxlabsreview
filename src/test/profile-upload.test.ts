import { beforeEach, describe, it, expect, vi } from "vitest";
import { auditSchema } from "@/lib/audit-fields";
const state = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), upload: vi.fn(), sign: vi.fn(), send: vi.fn(), check: vi.fn(), generate: vi.fn(), whatsapp: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({ inputValidator: () => ({ handler: (fn: unknown) => fn }) }) }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  from: () => ({ insert: state.insert, update: (data: unknown) => ({ eq: async () => state.update(data) }) }),
  storage: { from: () => ({ upload: state.upload, createSignedUrl: state.sign }) },
} }));
vi.mock("@/lib/website-checks.server", () => ({ runWebsiteChecks: state.check, saveThenCheck: async (save: () => Promise<unknown>, checks: () => Promise<unknown>) => { await save(); return checks(); } }));
vi.mock("@/lib/instant-breakdown.server", () => ({ generateInstantBreakdown: state.generate }));
vi.mock("@/lib/whatsapp-notify.server", () => ({ sendAuditWhatsApp: state.whatsapp }));
vi.mock("@/lib/owner-email.server", () => ({ sendAuditOwnerEmail: state.send }));
import { submitAudit } from "@/lib/forms.functions";
beforeEach(() => { vi.clearAllMocks(); state.insert.mockResolvedValue({ error: null }); state.update.mockResolvedValue({ error: null }); state.upload.mockResolvedValue({ error: null }); state.sign.mockResolvedValue({ data: { signedUrl: "https://example.com/private-signed-image" }, error: null }); state.send.mockResolvedValue(true); state.check.mockResolvedValue({ status: "no website" }); state.generate.mockResolvedValue(null); });
describe("Private profile upload flow", () => {
  it("submits with website, social media and screenshots all empty", async () => {
    const data = auditSchema.parse({ name: "Test", business_name: "Test", email: "test@example.com", whatsapp: "+2349034340796", industry_location: "Retail", challenge: "Low sales", running_ads: "No, never", report_preference: "Email", whatsapp_consent: true, website: "", social_media: "" });
    await expect(submitAudit({ data })).resolves.toEqual({ ok: true, breakdown: null });
    expect(state.insert.mock.calls[0]?.[0]).toMatchObject({ website: null, social_media: null, profile_screenshots: [] });
    expect(state.upload).not.toHaveBeenCalled();
    expect(state.whatsapp).toHaveBeenCalledWith("Test", "+2349034340796", { website: null, social_media: null, instagram: null, facebook: null, tiktok: null, x: null, linkedin: null, profile_screenshots: [], screenshot_path: null });
  });
  it.each([{}, { instagram: "@shop", facebook: "facebook.com/shop", tiktok: "@videos", x: "@updates", linkedin: "linkedin.com/company/shop" }])("routes optional social links separately to every destination: %j", async socials => {
    const data = auditSchema.parse({ name: "Test", business_name: "Test", email: "test@example.com", whatsapp: "+2349034340796", industry_location: "Retail", challenge: "Low sales", running_ads: "No, never", report_preference: "Email", whatsapp_consent: true, ...socials });
    const links = { instagram: data.instagram, facebook: data.facebook, tiktok: data.tiktok, x: data.x, linkedin: data.linkedin };
    await expect(submitAudit({ data })).resolves.toEqual({ ok: true, breakdown: null });
    expect(state.insert.mock.calls[0]?.[0]).toMatchObject(links);
    expect(state.generate.mock.calls[0]?.[1]).toMatchObject(links);
    expect(state.send.mock.calls[0]?.[0]).toMatchObject(links);
    expect(state.whatsapp.mock.calls[0]?.[2]).toMatchObject(links);
    expect(state.upload).not.toHaveBeenCalled();
  });
  it("routes separate online answers and private screenshot paths to each destination", async () => {
    const data = auditSchema.parse({ name: "Test", business_name: "Test", email: "test@example.com", whatsapp: "+2349034340796", industry_location: "Retail", challenge: "Low sales", running_ads: "No, never", report_preference: "Email", whatsapp_consent: true, website: "www.yourbusiness.com", social_media: "@yourbusiness", profile_screenshots: [{ name: "profile.png", type: "image/png", base64: "iVBORw0KGgo=" }] });
    await expect(submitAudit({ data })).resolves.toEqual({ ok: true, breakdown: null });
    expect(state.insert.mock.calls[0]?.[0]).toMatchObject({ website: "www.yourbusiness.com", social_media: "@yourbusiness" });
    expect(state.insert.mock.calls[0]?.[0]).not.toHaveProperty("online_links");
    expect(state.update.mock.calls[0]?.[0].profile_screenshots).toEqual([{ name: "profile.png", path: expect.stringMatching(/\.png$/) }]);
    expect(state.check.mock.calls[0]?.[0]).toBe("www.yourbusiness.com");
    expect(state.generate.mock.calls[0]?.[1]).toMatchObject({ website: "www.yourbusiness.com", social_media: "@yourbusiness", profile_screenshots: data.profile_screenshots });
    expect(state.send.mock.calls[0]?.[0]).toMatchObject({ website: "www.yourbusiness.com", social_media: "@yourbusiness" });
    expect(state.send.mock.calls[0]?.[6]).toEqual([{ platform: "Social media", name: "profile.png", url: "https://example.com/private-signed-image" }]);
    expect(state.whatsapp.mock.calls[0]?.[2]).toMatchObject({ website: "www.yourbusiness.com", social_media: "@yourbusiness", profile_screenshots: [{ name: "profile.png", path: expect.stringMatching(/\.png$/) }] });
    expect(state.sign).toHaveBeenCalledWith(expect.stringMatching(/\.png$/), 604800);
  });
  it("saves before uploading, persists paths, signs for exactly seven days, and never returns links to visitors", async () => {
    state.upload.mockImplementation(async () => { expect(state.insert).toHaveBeenCalledOnce(); return { error: null }; });
    const data = auditSchema.parse({ name: "Test", business_name: "Test", email: "test@example.com", whatsapp: "+2349034340796", industry_location: "Retail", challenge: "Low sales", running_ads: "No, never", report_preference: "Email", online_links: [{ platform: "Instagram", link: "@test", screenshots: [{ name: "profile.png", type: "image/png", base64: "iVBORw0KGgo=" }] }] });
    const response = await submitAudit({ data });
    expect(state.sign).toHaveBeenCalledWith(expect.stringMatching(/\.png$/), 604800);
    expect(state.update.mock.calls[0]?.[0].online_links[0].screenshots[0]).toEqual({ name: "profile.png", path: expect.stringMatching(/\.png$/) });
    expect(state.send.mock.calls[0]?.[6]).toEqual([{ platform: "Instagram", name: "profile.png", url: "https://example.com/private-signed-image" }]);
    expect(response).toEqual({ ok: true, breakdown: null });
    expect(JSON.stringify(state.update.mock.calls)).not.toContain("iVBORw0KGgo=");
  });
});