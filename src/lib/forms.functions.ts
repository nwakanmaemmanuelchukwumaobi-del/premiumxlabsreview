import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const s = (max: number) => z.string().trim().max(max);
const o = (max: number) => s(max).optional().transform((v) => v || null);

export const auditSchema = z.object({
  name: s(100).min(1, "Please enter your name"),
  business_name: s(150).min(1, "Please enter your business name"),
  email: s(255).email("Enter a valid email"),
  whatsapp: s(30).min(7, "Enter a valid WhatsApp number"),
  industry_location: s(200).min(1, "Tell us your industry and location"),
  links: o(1000),
  challenge: z.enum(["Few customers", "Low sales", "No online presence", "Weak branding", "Other"]),
  running_ads: z.enum(["Yes and getting results", "Yes but not getting results", "No, never", "Used to"]),
  ad_platform: o(150),
  ad_spend: o(100),
  report_preference: z.enum(["WhatsApp", "Email"]),
  screenshot: z
    .object({ name: s(200), type: s(100), base64: z.string().max(7_000_000) })
    .optional(),
});

export const submitAudit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => auditSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    const { error } = await supabaseAdmin.from("audit_requests").insert({ ...row, screenshot_path });
    if (error) {
      console.error(error);
      throw new Error("Could not save your request. Please try again.");
    }
    return { ok: true };
  });

export const serviceSchema = z.object({
  name: s(100).min(1, "Please enter your name"),
  business_name: o(150),
  contact: s(255).min(5, "Enter your WhatsApp number or email"),
  service: s(100).min(1, "Choose a service"),
  description: s(1500).min(5, "Tell us briefly what you need"),
});

export const submitService = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => serviceSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("service_requests").insert(data);
    if (error) throw new Error("Could not save your request. Please try again.");
    return { ok: true };
  });

export const contactSchema = z.object({
  name: s(100).min(1, "Please enter your name"),
  email: s(255).email("Enter a valid email"),
  phone: o(30),
  message: s(2000).min(5, "Please write a message"),
});

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => contactSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_messages").insert(data);
    if (error) throw new Error("Could not send your message. Please try again.");
    return { ok: true };
  });
