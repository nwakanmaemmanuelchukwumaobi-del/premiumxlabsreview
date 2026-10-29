import { beforeEach, describe, expect, it, vi } from "vitest";
import { SUBMISSION_ERROR } from "@/lib/submission-errors";

const state = vi.hoisted(() => ({ saved: false, send: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ inputValidator: () => ({ handler: (fn: (input: unknown) => unknown) => fn }) }),
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  from: () => ({ insert: async () => { state.saved = true; return { error: null }; } }),
} }));
vi.mock("@/lib/website-checks.server", () => ({
  runWebsiteChecks: async () => ({ status: "no website" }),
  saveThenCheck: async (save: () => Promise<unknown>, check: () => Promise<unknown>) => { await save(); return check(); },
}));
vi.mock("@/lib/instant-breakdown.server", () => ({ generateInstantBreakdown: async () => null }));
vi.mock("@/lib/owner-email.server", () => ({ sendAuditOwnerEmail: state.send }));
import { submitAudit } from "@/lib/forms.functions";
import { auditSchema } from "@/lib/audit-fields";

const data = auditSchema.parse({ name: "Test Visitor", business_name: "Test Business", email: "visitor@example.com", whatsapp: "+2348000000000", industry_location: "Retail, Abuja", challenge: "Low sales", running_ads: "No, never", report_preference: "Email" });
beforeEach(() => { state.saved = false; state.send.mockReset(); vi.spyOn(console, "error").mockImplementation(() => {}); });
describe("Audit email outcome", () => {
  it("keeps the submission saved but returns a friendly error when email fails", async () => {
    state.send.mockImplementation(async () => { expect(state.saved).toBe(true); return false; });
    await expect(submitAudit({ data })).rejects.toThrow(SUBMISSION_ERROR);
    expect(state.saved).toBe(true);
  });
  it("returns success only after the saved audit's email is accepted", async () => {
    state.send.mockImplementation(async () => { expect(state.saved).toBe(true); return true; });
    await expect(submitAudit({ data })).resolves.toEqual({ ok: true, breakdown: null });
    expect(state.send).toHaveBeenCalledOnce();
  });
});