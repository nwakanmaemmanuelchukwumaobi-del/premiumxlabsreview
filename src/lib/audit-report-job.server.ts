import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { auditSchema } from "./audit-fields";
import { hashValue } from "./audit-cache.server";
import { cachedWebsiteChecks, generateGoogleReport, partialReport } from "./google-audit.server";
import { sendProspectReportEmail } from "./prospect-report-email.server";
import { sendAuditOwnerEmail } from "./owner-email.server";
import { reportSchema, type GoogleReport } from "./google-audit";
import type { WebsiteChecks } from "./website-checks.server";
import type { SignedProfileImage } from "./profile-screenshots";

export async function enqueueAuditReport(id: string, answers: z.infer<typeof auditSchema>) {
  const token = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  const context = { business_name: answers.business_name, offering_type: answers.offering_type ?? "Services" as const, main_offering: answers.main_offering ?? answers.business_name, main_service: answers.main_service, city: answers.city ?? "", state: answers.state ?? "" };
  const checks: WebsiteChecks = { status: answers.website ? "skipped" : "no website", website: answers.website, checked_at: new Date().toISOString(), page: {}, pagespeed: {} };
  const report = partialReport(context, answers.website, checks);
  report.offering = context.main_offering; report.city = context.city;
  const { error: linkError } = await supabaseAdmin.from("audit_report_links").insert({ audit_id: id, token_hash: await hashValue(token), report: JSON.parse(JSON.stringify(report)), permanent: true });
  if (linkError) throw new Error("Could not save report link");
  const { error } = await supabaseAdmin.from("audit_report_jobs").insert({ audit_id: id, report_token: token, callback_token: `${crypto.randomUUID()}${crypto.randomUUID()}`, report: JSON.parse(JSON.stringify(report)) });
  if (error) throw new Error("Could not queue report");
  return { token, url: `https://premiumxlabs.com/report/${token}` };
}

export async function processAuditReportJob(id: string, callback: string) {
  const lease = crypto.randomUUID();
  const { data: claimed, error } = await supabaseAdmin.rpc("claim_audit_report_job", { p_id: id, p_callback: callback, p_lease: lease });
  if (error || !claimed) return false;
  const { data: job } = await supabaseAdmin.from("audit_report_jobs").select("audit_id,report_token").eq("id", id).eq("lease_id", lease).single();
  if (!job) return false;
  try {
    const { data: row } = await supabaseAdmin.from("audit_requests").select("*").eq("id", job.audit_id).single();
    if (!row) throw new Error("Saved audit missing");
    // Uploads are already persisted; do not revalidate stored paths as fresh uploads.
    const answers = auditSchema.parse({ ...row, screenshot: undefined, profile_screenshots: [], online_links: [], goals: row.goals ?? [], ad_platforms: row.ad_platforms ?? [] });
    if (!answers.offering_type || !answers.main_offering || !answers.city || !answers.state) throw new Error("Audit context missing");
    const context = { business_name: answers.business_name, offering_type: answers.offering_type, main_offering: answers.main_offering, main_service: answers.main_service, city: answers.city, state: answers.state };
    const initial: WebsiteChecks = { status: "skipped", website: answers.website, checked_at: new Date().toISOString(), page: {}, pagespeed: {} };
    const publish = async (report: GoogleReport, steps: number[]) => {
      const payload = JSON.parse(JSON.stringify(reportSchema.parse(report)));
      const { error } = await supabaseAdmin.from("audit_report_jobs").update({ report: payload, steps, updated_at: new Date().toISOString() }).eq("id", id).eq("lease_id", lease);
      if (error) throw new Error("Progress storage failed");
      await supabaseAdmin.from("audit_report_links").update({ report: payload }).eq("token_hash", await hashValue(job.report_token));
      await supabaseAdmin.from("audit_requests").update({ google_report: payload }).eq("id", job.audit_id);
    };
    // Defer the client check until search calls finish to keep outbound headers within six.
    let checks = initial;
    const clientWork = { then: (resolve: (v: WebsiteChecks) => unknown, reject: (e: unknown) => unknown) => cachedWebsiteChecks(answers.website ?? undefined, process.env['PAGESPEED_API_KEY']).then(v => { checks = v; return resolve(v); }, reject) };
    const report = await generateGoogleReport(context, answers.website, initial, publish, Promise.resolve(clientWork));
    await supabaseAdmin.from("audit_requests").update({ website_checks: JSON.parse(JSON.stringify(checks)) }).eq("id", job.audit_id);
    await supabaseAdmin.from("audit_report_jobs").update({ status: "complete", lease_until: null, updated_at: new Date().toISOString() }).eq("id", id).eq("lease_id", lease);
    const url = `https://premiumxlabs.com/report/${job.report_token}`;
    const images: SignedProfileImage[] = [];
    const stored = z.array(z.object({ path: z.string(), name: z.string() })).safeParse(row.profile_screenshots);
    for (const image of stored.success ? stored.data : []) {
      const { data } = await supabaseAdmin.storage.from("audit-screenshots").createSignedUrl(image.path, 7 * 86400);
      if (data?.signedUrl) images.push({ platform: "Social media", name: image.name, url: data.signedUrl });
    }
    let screenshotUrl: string | null = null;
    if (row.screenshot_path) { const { data } = await supabaseAdmin.storage.from("audit-screenshots").createSignedUrl(row.screenshot_path, 7 * 86400); screenshotUrl = data?.signedUrl ?? null; }
    const [emailSent, ownerSent] = await Promise.all([
      sendProspectReportEmail(answers.email, answers.business_name, job.audit_id, url, report),
      sendAuditOwnerEmail(answers, null, checks, job.audit_id, new Date(row.created_at), screenshotUrl, images, { report, url }),
    ]);
    await supabaseAdmin.from("audit_report_jobs").update({ email_sent: emailSent, owner_email_sent: ownerSent, failure: !emailSent || !ownerSent ? "Email delivery was not accepted." : null }).eq("id", id).eq("lease_id", lease);
    return true;
  } catch {
    console.error("Saved audit report task failed; submission retained.");
    await supabaseAdmin.from("audit_report_jobs").update({ status: "failed", failure: "Report needs owner review.", lease_until: null }).eq("id", id).eq("lease_id", lease);
    return false;
  }
}