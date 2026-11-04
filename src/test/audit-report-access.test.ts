import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ row: null as unknown, filters: [] as unknown[][] }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({ inputValidator: (validate: (v: unknown) => unknown) => ({ handler: (handler: (v: unknown) => unknown) => (v: { data: unknown }) => handler({ data: validate(v.data) }) }) }) }));
vi.mock("@tanstack/react-start/server", () => ({ setResponseHeader: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => ({ select: () => { const q = { eq: (...args: unknown[]) => { state.filters.push(args); return q; }, maybeSingle: async () => ({ data: state.row, error: null }) }; return q; } }) } }));
vi.mock("@/lib/audit-cache.server", () => ({ hashValue: async (token: string) => `hashed-${token}` }));
import { getAuditReport } from "@/lib/audit-report.functions";
const token = "a".repeat(64);
beforeEach(() => { state.row = null; state.filters = []; });
describe("Saved report access", () => {
  it("rejects malformed links before any lookup", async () => { await expect(getAuditReport({ data: { token: "guess" } })).rejects.toThrow(); expect(state.filters).toHaveLength(0); });
  it("looks up only a hashed matching token and excludes revoked reports", async () => { await expect(getAuditReport({ data: { token } })).resolves.toBeNull(); expect(state.filters).toEqual([["token_hash", `hashed-${token}`], ["revoked", false]]); });
  it("returns only allowlisted report fields, not contact or private images", async () => { state.row = { report: { version: 1, business: "Ada", website: null, location: "Abuja", checked_at: "2026-11-04", searches: [], speed: { seconds: null, performance: null }, maps: { status: "unavailable", rating: null, reviews: null }, score: { earned: 0, coverage: 0, complete: false }, fixes: [], email: "private@example.com", profile_screenshots: ["private/path"] } }; const result = await getAuditReport({ data: { token } }); expect(result?.business).toBe("Ada"); expect(result).not.toHaveProperty("email"); expect(result).not.toHaveProperty("profile_screenshots"); });
});