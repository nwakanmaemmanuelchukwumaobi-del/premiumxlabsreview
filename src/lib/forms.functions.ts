import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { auditSchema } from "@/lib/audit-fields";
import { withSafeSubmission } from "@/lib/submission-errors";

export { auditSchema } from "@/lib/audit-fields";

const s = (max: number) => z.string().trim().max(max);
const o = (max: number) => s(max).optional().transform((v) => v || null);

export const submitAudit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => auditSchema.parse(d))
  .handler(async ({ data }) => withSafeSubmission(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runWebsiteChecks, saveThenCheck } = await import("@/lib/website-checks.server");
    let screenshot_path: string | null = null;
    if (data.screenshot && data.screenshot.type.startsWith("image/")) {
      const bytes = Uint8Array.from(atob(data.screenshot.base64), (c) => c.charCodeAt(0));
      const ext = data.screenshot.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "png";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabaseAdmin.storage
        .from("audit-screenshots")
        .upload(path, bytes, { contentType: data.screenshot.type });
      if (!error) screenshot_path = path;
    }
    const { screenshot: _s, ...row } = data;
    let savedId: string | null = null;
    const results = await saveThenCheck(
      async () => {
        const id = crypto.randomUUID();
        const { error } = await supabaseAdmin.from("audit_requests").insert({ ...row, screenshot_path, id });
        if (error) throw new Error("Could not save your request. Please try again.");
        savedId = id;
        return id;
      },
      () => runWebsiteChecks(data.online_links.find((entry) => entry.platform === "Website")?.link, process.env['PAGESPEED_API_KEY']),
      async (id, results) => {
        const { error } = await supabaseAdmin.from("audit_requests").update({ website_checks: JSON.parse(JSON.stringify(results)) }).eq("id", id);
        if (error) throw new Error("Could not store checks");
      },
    );
    let breakdown: import("./instant-breakdown").Breakdown | null = null;
    try {
      const { generateInstantBreakdown } = await import("./instant-breakdown.server");
      const generated = await generateInstantBreakdown(results, data);
      if (generated && savedId) {
        const { error } = await supabaseAdmin.from("audit_requests").update({ instant_breakdown: JSON.parse(JSON.stringify(generated)) }).eq("id", savedId);
        if (!error) breakdown = generated;
      }
    } catch { /* The audit is saved even if generation or storage fails. */ }
    return { ok: true, breakdown };
  }));

export const serviceSchema = z.object({
  name: s(100).min(1, "Please enter your name"),
  business_name: o(150),
  contact: s(255).min(5, "Enter your WhatsApp number or email"),
  service: s(100).min(1, "Choose a service"),
  description: s(1500).min(5, "Tell us briefly what you need"),
});

export const submitService = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => serviceSchema.parse(d))
  .handler(async ({ data }) => withSafeSubmission(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("service_requests").insert(data);
    if (error) throw new Error("Could not save your request. Please try again.");
    return { ok: true };
  }));

export const contactSchema = z.object({
  name: s(100).min(1, "Please enter your name"),
  email: s(255).email("Enter a valid email"),
  phone: o(30),
  message: s(2000).min(5, "Please write a message"),
});

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => contactSchema.parse(d))
  .handler(async ({ data }) => withSafeSubmission(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_messages").insert(data);
    if (error) throw new Error("Could not send your message. Please try again.");
    return { ok: true };
  }));
