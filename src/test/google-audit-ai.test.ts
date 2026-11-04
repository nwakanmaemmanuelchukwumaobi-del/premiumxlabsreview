// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ stream: vi.fn() }));
vi.mock("@lovable.dev/ai-gateway", () => ({ streamResponse: mocks.stream, GatewayError: class extends Error {} }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => new Request("https://premiumxlabs.com") }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { paused: false }, error: null }) }) }) }) } }));
import { analyzePages } from "@/lib/google-audit-ai.server";
const client = { available: true, headline: null, contact: false, quote: false, links: [{ label: "Sandals", url: "https://ada.ng/sandals" }] };
beforeEach(() => { vi.clearAllMocks(); });
describe("Homepage AI evidence guard", () => {
  it("rejects invented secondary offerings and unsupported competitor claims", async () => { mocks.stream.mockResolvedValue((async function* () { yield { type: "response.output_text.delta", delta: JSON.stringify({ secondary: "Invented product", differences: [{ competitor: 0, feature: "quote" }, { competitor: 0, feature: "contact" }] }) }; })()); const result = await analyzePages("shoes", client, [{ available: true, headline: "Store", contact: true, quote: false, links: [] }]); expect(result).toEqual({ secondary: null, differences: [{ competitor: 0, feature: "contact" }] }); });
  it("accepts a secondary product only when present verbatim in the homepage evidence", async () => { mocks.stream.mockResolvedValue((async function* () { yield { type: "response.output_text.delta", delta: JSON.stringify({ secondary: "Sandals", differences: [] }) }; })()); expect((await analyzePages("shoes", client)).secondary).toBe("Sandals"); });
});