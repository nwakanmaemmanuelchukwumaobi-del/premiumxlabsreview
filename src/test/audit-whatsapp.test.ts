import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auditSchema } from "@/lib/audit-fields";

const state = vi.hoisted(() => ({ insert: vi.fn(), send: vi.fn(), email: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({ inputValidator: () => ({ handler: (fn: unknown) => fn }) }) }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => ({ insert: state.insert }) } }));
vi.mock("@/lib/website-checks.server", () => ({ runWebsiteChecks: async () => ({ status: "no website" }), saveThenCheck: async (save: () => Promise<unknown>, check: () => Promise<unknown>) => { await save(); return check(); } }));
vi.mock("@/lib/instant-breakdown.server", () => ({ generateInstantBreakdown: async () => null }));
vi.mock("@/lib/owner-email.server", () => ({ sendAuditOwnerEmail: state.email }));
vi.mock("@/lib/whatsapp-notify.server", () => ({ sendAuditWhatsApp: state.send }));
import { submitAudit } from "@/lib/forms.functions";
const base = { name: "Ada Okafor", business_name: "Test business", email: "test@example.com", whatsapp: "08031234567", industry_location: "Retail, Abuja", challenge: "Low sales", running_ads: "No, never", report_preference: "WhatsApp" };
beforeEach(() => {
  vi.clearAllMocks();
  state.insert.mockResolvedValue({ error: null });
  state.email.mockResolvedValue(true);
  state.send.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
describe("Audit WhatsApp integration (all external services mocked)", () => {
  it.each([undefined, false])("does not send without explicit consent: %s", async consent => {
    await expect(submitAudit({ data: auditSchema.parse({ ...base, whatsapp_consent: consent }) })).resolves.toEqual({ ok: true, breakdown: null });
    expect(state.send).not.toHaveBeenCalled();
    expect(state.insert.mock.calls[0]?.[0].whatsapp_consent).toBe(false);
  });
  it("saves consent and the full international number before sending once", async () => {
    state.send.mockImplementation(async () => { expect(state.insert).toHaveBeenCalledOnce(); });
    await submitAudit({ data: auditSchema.parse({ ...base, whatsapp_consent: true }) });
    expect(state.send).toHaveBeenCalledExactlyOnceWith("Ada Okafor", "+2348031234567", { website: null, social_media: null, instagram: null, facebook: null, tiktok: null, profile_screenshots: [], screenshot_path: null });
    expect(state.insert.mock.calls[0]?.[0]).toMatchObject({ whatsapp_consent: true, whatsapp: "+2348031234567" });
  });
  it("still succeeds with a saved audit when WhatsApp rejects the request", async () => {
    state.send.mockRejectedValue(new Error("Provider rejected request"));
    await expect(submitAudit({ data: auditSchema.parse({ ...base, whatsapp_consent: true }) })).resolves.toEqual({ ok: true, breakdown: null });
    expect(state.insert).toHaveBeenCalledOnce();
    expect(state.email).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledWith("WhatsApp notification failed; audit submission remains saved.");
  });
  it("does not send when saving the audit fails", async () => {
    state.insert.mockResolvedValue({ error: { message: "Save failed" } });
    await expect(submitAudit({ data: auditSchema.parse({ ...base, whatsapp_consent: true }) })).rejects.toThrow();
    expect(state.send).not.toHaveBeenCalled();
  });
});