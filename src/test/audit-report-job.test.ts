// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), provider: vi.fn(), email: vi.fn(), owner: vi.fn(), order: [] as string[] }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: state.rpc, from: state.from } }));
vi.mock("@/lib/audit-cache.server", () => ({ hashValue: async (v: string) => `hash:${v}` }));
vi.mock("@/lib/google-audit.server", () => ({ partialReport: () => ({ version: 1, business: "Ada", website: null, location: "Abuja", checked_at: "2026-11-04", searches: [], speed: { seconds: null, performance: null }, maps: { status: "unavailable", rating: null, reviews: null }, score: { earned: 0, coverage: 0, complete: false }, fixes: [] }), cachedWebsiteChecks: state.provider, generateGoogleReport: state.provider }));
vi.mock("@/lib/prospect-report-email.server", () => ({ sendProspectReportEmail: state.email }));
vi.mock("@/lib/owner-email.server", () => ({ sendAuditOwnerEmail: state.owner }));
import { enqueueAuditReport, processAuditReportJob } from "@/lib/audit-report-job.server";
import { auditSchema } from "@/lib/audit-fields";
const answers = auditSchema.parse({ name: "Ada", business_name: "Ada", email: "ada@example.com", whatsapp: "09012345678", industry_location: "Retail", challenge: "Low sales", running_ads: "No, never", report_preference: "Email", offering_type: "Products", main_offering: "shoes", city: "Abuja", state: "FCT" });
beforeEach(() => { vi.clearAllMocks(); state.rpc.mockResolvedValue({ data: true, error: null }); });
describe("Durable report handoff", () => {
  it("atomically creates a permanent live-domain capability and private job", async () => { const result = await enqueueAuditReport("saved-id", answers); expect(result.url).toBe(`https://premiumxlabs.com/report/${result.token}`); expect(result.token).toMatch(/^[a-f0-9]{64}$/); expect(state.rpc).toHaveBeenCalledWith("enqueue_audit_report", expect.objectContaining({ p_audit: "saved-id", p_hash: `hash:${result.token}`, p_token: result.token, p_report: expect.objectContaining({ offering: "shoes", city: "Abuja" }) })); expect(state.from).not.toHaveBeenCalled(); });
  it("rejects an atomic queue failure rather than returning a nonexistent link", async () => { state.rpc.mockResolvedValue({ error: {} }); await expect(enqueueAuditReport("saved-id", answers)).rejects.toThrow(); });
  it("never runs checks or emails for an unverified or duplicate callback", async () => { state.rpc.mockResolvedValue({ data: false, error: null }); expect(await processAuditReportJob("id", "wrong")).toBe(false); expect(state.from).not.toHaveBeenCalled(); expect(state.provider).not.toHaveBeenCalled(); expect(state.email).not.toHaveBeenCalled(); });
});