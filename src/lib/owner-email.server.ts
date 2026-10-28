import type { z } from "zod";
import type { auditSchema } from "./audit-fields";
import type { Breakdown } from "./instant-breakdown";

type Answers = z.infer<typeof auditSchema>;

export const OWNER_EMAIL_TO = "hello@premiumxlabs.com";
export const OWNER_EMAIL_FROM = "premiumxlabs <notifications@premiumxlabs.com>";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function summarizeChecks(checks: any): string[] {
  if (!checks || typeof checks !== "object") return ["No website check results saved."];
  if (checks.status === "no website") return ["No website provided."];
  if (checks.status === "skipped") return ["Website checks were skipped."];
  const out: string[] = [];
  const ps = checks.pagespeed ?? {};
  const pg = checks.page ?? {};
  out.push(`PageSpeed (mobile): ${ps.status ?? "unknown"}${ps.fcpSeconds != null ? ` — first content ${ps.fcpSeconds}s` : ""}`);
  out.push(`Page fetch: ${pg.status ?? "unknown"}`);
  if (pg.status === "completed") {
    const yn = (b: unknown) => (b ? "yes" : "no");
    if ("https" in pg) out.push(`HTTPS: ${yn(pg.https)}`);
    if ("title" in pg) out.push(`Title: ${pg.title || "none found"}`);
    if ("metaDescription" in pg) out.push(`Meta description: ${pg.metaDescription || "none found"}`);
    if ("headline" in pg) out.push(`Main headline: ${pg.headline || "none found"}`);
    if ("contactOrCta" in pg) out.push(`Contact / call to action found: ${yn(pg.contactOrCta)}`);
    if ("socialLinks" in pg) out.push(`Social links found: ${Array.isArray(pg.socialLinks) ? pg.socialLinks.length || "none" : yn(pg.socialLinks)}`);
  }
  return out;
}

export function buildAuditEmail(a: Answers, breakdown: Breakdown | null, checks: unknown, submittedAt: Date) {
  const website = a.online_links.find((l) => l.platform === "Website")?.link ?? "None";
  const socials = a.online_links.filter((l) => l.platform !== "Website")
    .map((l) => `${l.platform === "Other" ? l.other_name || "Other" : l.platform}: ${l.link}`);
  const goals = a.goals.map((g) => (g === "Other" && a.goals_other ? `Other: ${a.goals_other}` : g));
  const platforms = a.ad_platforms.map((p) => (p === "Other" && a.ad_platform_other ? `Other: ${a.ad_platform_other}` : p));
  const time = submittedAt.toLocaleString("en-GB", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }) + " (Lagos)";

  const rows: [string, string][] = [
    ["Name", a.name], ["Business", a.business_name], ["WhatsApp", a.whatsapp], ["Email", a.email],
    ["Industry & location", a.industry_location], ["Website", website],
    ["Social links", socials.join("\n") || "None"], ["Biggest challenge", a.challenge],
    ["Running ads", a.running_ads], ["Ad platforms", platforms.join(", ") || "—"], ["Monthly ad spend", a.ad_spend || "—"],
    ["Goals", goals.join(", ") || "—"], ["Report via", a.report_preference], ["Submitted", time],
  ];
  const bd = breakdown ? [...breakdown.problems, breakdown.closing] : ["No instant breakdown was shown (AI step unavailable)."];
  const cs = summarizeChecks(checks);

  const html = `<div style="font-family:Arial,sans-serif;color:#14234D;max-width:640px">
<h2>New audit request: ${esc(a.business_name)}</h2>
<table style="border-collapse:collapse;width:100%">${rows.map(([k, v]) => `<tr><td style="padding:6px;border-bottom:1px solid #eee;font-weight:bold;vertical-align:top;width:170px">${esc(k)}</td><td style="padding:6px;border-bottom:1px solid #eee;white-space:pre-line">${esc(v)}</td></tr>`).join("")}</table>
<h3>Instant breakdown shown</h3><ol>${bd.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
<h3>Website check summary</h3><ul>${cs.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>`;
  const text = [...rows.map(([k, v]) => `${k}: ${v}`), "", "Instant breakdown:", ...bd.map((p) => `- ${p}`), "", "Website checks:", ...cs.map((c) => `- ${c}`)].join("\n");
  return { subject: `New audit request: ${a.business_name}`, html, text };
}

/** Never throws; email failures must not affect the submission. */
export async function sendAuditOwnerEmail(a: Answers, breakdown: Breakdown | null, checks: unknown, id: string | null) {
  try {
    const key = process.env["RESEND_API_KEY"];
    if (!key) return false;
    const { subject, html, text } = buildAuditEmail(a, breakdown, checks, new Date());
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(id ? { "Idempotency-Key": `audit-${id}` } : {}) },
      body: JSON.stringify({ from: OWNER_EMAIL_FROM, to: [OWNER_EMAIL_TO], reply_to: a.email, subject, html, text }),
    });
    if (!res.ok) console.error(`Owner email failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
    return res.ok;
  } catch {
    console.error("Owner email failed to send.");
    return false;
  }
}
