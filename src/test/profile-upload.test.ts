import { beforeEach, describe, it, expect, vi } from "vitest";
import { auditSchema } from "@/lib/audit-fields";
const state = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), upload: vi.fn(), sign: vi.fn(), send: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({ inputValidator: () => ({ handler: (fn: unknown) => fn }) }) }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  from: () => ({ insert: state.insert, update: (data: unknown) => ({ eq: async () => state.update(data) }) }),
  storage: { from: () => ({ upload: state.upload, createSignedUrl: state.sign }) },
} }));
vi.mock("@/lib/website-checks.server", () => ({ runWebsiteChecks: async () => ({ status: "no website" }), saveThenCheck: async (save: () => Promise<unknown>, checks: () => Promise<unknown>) => { await save(); return checks(); } }));
vi.mock("@/lib/instant-breakdown.server", () => ({ generateInstantBreakdown: async () => null }));
vi.mock("@/lib/owner-email.server", () => ({ sendAuditOwnerEmail: state.send }));
import { submitAudit } from "@/lib/forms.functions";
beforeEach(() => { vi.clearAllMocks(); state.insert.mockResolvedValue({ error: null }); state.update.mockResolvedValue({ error: null }); state.upload.mockResolvedValue({ error: null }); state.sign.mockResolvedValue({ data: { signedUrl: "https://example.com/private-signed-image" }, error: null }); state.send.mockResolvedValue(true); });
describe("Private profile upload flow", () => {
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