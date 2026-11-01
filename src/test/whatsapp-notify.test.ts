import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendAuditWhatsApp } from "@/lib/whatsapp-notify.server";

const request = vi.fn();
beforeEach(() => {
  vi.stubEnv("YCLOUD_API_KEY", "unit-test-only-not-a-credential");
  vi.stubGlobal("fetch", request);
  request.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("YCloud template request (no real network)", () => {
  it("uses the exact sender, template, English language and first name parameter", async () => {
    request.mockResolvedValue({ ok: true });
    await sendAuditWhatsApp("Ada Okafor", "+2348031234567");
    expect(request).toHaveBeenCalledOnce();
    const [url, options] = request.mock.calls[0];
    expect(url).toBe("https://api.ycloud.com/v2/whatsapp/messages");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      from: "+2349034340796", to: "+2348031234567", type: "template",
      template: { name: "audit_recieved", language: { code: "en" },
        components: [{ type: "body", parameters: [{ type: "text", text: "Ada Okafor" }] }] },
    });
  });
  it("does not make a request when the key is absent", async () => {
    vi.stubEnv("YCLOUD_API_KEY", "");
    await expect(sendAuditWhatsApp("Ada", "+2348031234567")).rejects.toThrow("not configured");
    expect(request).not.toHaveBeenCalled();
  });
  it("does not read or log a provider error body", async () => {
    const body = vi.fn();
    request.mockResolvedValue({ ok: false, status: 401, text: body, json: body });
    await expect(sendAuditWhatsApp("Ada", "+2348031234567")).rejects.toThrow("WhatsApp send failed (401)");
    expect(body).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("YCloud WhatsApp send failed with status 401.");
  });
});