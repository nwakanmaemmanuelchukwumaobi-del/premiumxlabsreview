import { OWNER_EMAIL_FROM } from "./owner-email.server";
import type { GoogleReport } from "./google-audit";

export function buildProspectReportEmail(business: string, url: string, report: GoogleReport) {
  return { subject: "Your Online Visibility Report is ready", text: `Your premiumxlabs online visibility report is ready.\n\nBusiness: ${business}\n\nView your report: ${url}\n\nYour social media review will arrive within 24 hours.\n\nOnly share this link with people you want to see your report.` };
}
export async function sendProspectReportEmail(email: string, business: string, id: string, url: string, report: GoogleReport): Promise<boolean> {
  try {
    const key = process.env["RESEND_API_KEY"];
    if (!key) return false;
    const content = buildProspectReportEmail(business, url, report);
    const response = await fetch("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `audit-report-${id}` }, body: JSON.stringify({ from: OWNER_EMAIL_FROM, to: [email], ...content }) });
    if (!response.ok) console.error(`Prospect report email failed [${response.status}].`);
    else console.info("Prospect audit report email accepted by Resend.");
    return response.ok;
  } catch { console.error("Prospect report email failed; saved report remains available."); return false; }
}