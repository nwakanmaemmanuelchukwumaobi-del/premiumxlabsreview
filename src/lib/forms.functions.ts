import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { auditSchema } from "@/lib/audit-fields";
import { withSafeSubmission } from "@/lib/submission-errors";
import { matchesImageType, type SignedProfileImage, type StoredProfileImage } from "./profile-screenshots";

export { auditSchema } from "@/lib/audit-fields";

const s = (max: number) => z.string().trim().max(max);
const o = (max: number) => s(max).optional().transform((v) => v || null);

export const submitAudit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => auditSchema.parse(d))
  .handler(async ({ data }) => withSafeSubmission(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runWebsiteChecks, saveThenCheck } = await import("@/lib/website-checks.server");
    const upgraded = !!data.offering_type && !!data.main_offering && !!data.city && !!data.state;
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
    const { screenshot: _s, profile_screenshots: _profile, online_links: _legacyLinks, ...row } = data;
    const profileScreenshots: StoredProfileImage[] = [];
    const onlineLinks = data.online_links.map(({ screenshots: _images, ...entry }) => ({ ...entry, screenshots: [] as StoredProfileImage[] }));
    const signedProfileImages: SignedProfileImage[] = [];
    const submittedAt = new Date();
    let savedId: string | null = null;
    const results = await saveThenCheck(
      async () => {
        const id = crypto.randomUUID();
        const { error } = await supabaseAdmin.from("audit_requests").insert({ ...row, profile_screenshots: profileScreenshots, screenshot_path, id, created_at: submittedAt.toISOString() });
        if (error) throw new Error("Could not save your request. Please try again.");
        savedId = id;
        for (const image of data.profile_screenshots) {
          const bytes = Uint8Array.from(atob(image.base64), c => c.charCodeAt(0));
          if (!matchesImageType(bytes, image.type)) throw new Error("Invalid screenshot content");
          const extension = image.type === "image/jpeg" ? "jpg" : image.type === "image/webp" ? "webp" : "png";
          const path = `${id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabaseAdmin.storage.from("audit-screenshots").upload(path, bytes, { contentType: image.type });
          if (uploadError) throw new Error("Could not save screenshot");
          profileScreenshots.push({ name: image.name, path });
          const { error: storeError } = await supabaseAdmin.from("audit_requests").update({ profile_screenshots: profileScreenshots }).eq("id", id);
          if (storeError) throw new Error("Could not record screenshot");
          const { data: signed, error: signError } = await supabaseAdmin.storage.from("audit-screenshots").createSignedUrl(path, 7 * 24 * 60 * 60);
          if (signError || !signed?.signedUrl) throw new Error("Could not prepare private screenshot link");
          signedProfileImages.push({ platform: "Social media", name: image.name, url: signed.signedUrl });
        }
        for (const [index, entry] of data.online_links.entries()) {
          const stored = onlineLinks[index];
          if (!stored) continue;
          for (const image of entry.screenshots) {
            const bytes = Uint8Array.from(atob(image.base64), c => c.charCodeAt(0));
            if (!matchesImageType(bytes, image.type)) throw new Error("Invalid screenshot content");
            const extension = image.type === "image/jpeg" ? "jpg" : image.type === "image/webp" ? "webp" : "png";
            const path = `${id}/${crypto.randomUUID()}.${extension}`;
            const { error: uploadError } = await supabaseAdmin.storage.from("audit-screenshots").upload(path, bytes, { contentType: image.type });
            if (uploadError) throw new Error("Could not save screenshot");
            stored.screenshots.push({ name: image.name, path });
            const { error: storeError } = await supabaseAdmin.from("audit_requests").update({ online_links: onlineLinks }).eq("id", id);
            if (storeError) throw new Error("Could not record screenshot");
            const { data: signed, error: signError } = await supabaseAdmin.storage.from("audit-screenshots").createSignedUrl(path, 7 * 24 * 60 * 60);
            if (signError || !signed?.signedUrl) throw new Error("Could not prepare private screenshot link");
            signedProfileImages.push({ platform: entry.platform === "Other" ? entry.other_name ?? "Other" : entry.platform, name: image.name, url: signed.signedUrl });
          }
        }
        return id;
      },
      async () => upgraded ? (await import("./google-audit.server")).cachedWebsiteChecks(data.website ?? undefined, process.env['PAGESPEED_API_KEY']) : runWebsiteChecks(data.website ?? undefined, process.env['PAGESPEED_API_KEY']),
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
    let googleReport: { report: import("./google-audit").GoogleReport; url: string | null } | null = null;
    if (upgraded && savedId) {
      try {
        const { createSavedGoogleReport } = await import("./google-audit.server");
        googleReport = await createSavedGoogleReport(savedId, data, results);
      } catch { console.error("Google report unavailable; saved audit and website breakdown retained."); }
    }
    let emailSent = false;
    try {
      const { sendAuditOwnerEmail } = await import("./owner-email.server");
      let screenshotUrl: string | null = null;
      if (screenshot_path) {
        try {
          const { data: signed } = await supabaseAdmin.storage.from("audit-screenshots").createSignedUrl(screenshot_path, 7 * 24 * 60 * 60);
          screenshotUrl = signed?.signedUrl ?? null;
        } catch { console.error("Owner email screenshot link unavailable; saved audit remains in inbox."); }
      }
      emailSent = await sendAuditOwnerEmail(data, breakdown, results, savedId, submittedAt, screenshotUrl, signedProfileImages, googleReport);
    } catch { console.error("Owner email notification failed; audit submission remains saved."); }
    if (data.whatsapp_consent) {
      try {
        const { sendAuditWhatsApp } = await import("./whatsapp-notify.server");
        await sendAuditWhatsApp(data.name, data.whatsapp, { website: data.website, social_media: data.social_media, instagram: data.instagram, facebook: data.facebook, tiktok: data.tiktok, x: data.x, linkedin: data.linkedin, profile_screenshots: profileScreenshots, screenshot_path });
      } catch { console.error("WhatsApp notification failed; audit submission remains saved."); }
    }
    if (googleReport && savedId) {
      if (googleReport.url) {
        const { sendProspectReportEmail } = await import("./prospect-report-email.server");
        await sendProspectReportEmail(data.email, data.business_name, savedId, googleReport.url, googleReport.report);
      }
      if (!emailSent) console.error("Owner notification failed; saved report still shown to prospect.");
      return { ok: true, breakdown, googleReport: googleReport.report, reportUrl: googleReport.url };
    }
    if (!emailSent && !upgraded) throw new Error("Audit saved but owner notification failed.");
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
