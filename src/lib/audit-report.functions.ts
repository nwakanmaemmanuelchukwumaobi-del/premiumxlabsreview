import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { reportSchema } from "./google-audit";

export const getAuditReport = createServerFn({ method: "GET" }).inputValidator((v: unknown) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(v)).handler(async ({ data }) => {
  setResponseHeader("Cache-Control", "no-store");
  setResponseHeader("X-Robots-Tag", "noindex, nofollow");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { hashValue } = await import("./audit-cache.server");
  const { data: row, error } = await supabaseAdmin.from("audit_report_links").select("report,expires_at,permanent").eq("token_hash", await hashValue(data.token)).eq("revoked", false).maybeSingle();
  if (error || !row || (!row.permanent && (new Date(row.expires_at).getTime() <= Date.now() || !Number.isFinite(new Date(row.expires_at).getTime())))) return null;
  const parsed = reportSchema.safeParse(row.report);
  return parsed.success ? parsed.data : null;
});

export const getAuditProgress = createServerFn({ method: "GET" }).inputValidator((v: unknown) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(v)).handler(async ({ data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { hashValue } = await import("./audit-cache.server");
  const { data: link } = await supabaseAdmin.from("audit_report_links").select("permanent,expires_at").eq("token_hash", await hashValue(data.token)).eq("revoked", false).maybeSingle();
  if (!link || (!link.permanent && (!Number.isFinite(new Date(link.expires_at).getTime()) || new Date(link.expires_at).getTime() <= Date.now()))) return null;
  const { data: job } = await supabaseAdmin.from("audit_report_jobs").select("status,steps,report,updated_at").eq("report_token", data.token).maybeSingle();
  if (!job) return null;
  const report = reportSchema.safeParse(job.report);
  return { status: job.status === "running" && Date.now() - new Date(job.updated_at).getTime() > 120000 ? "failed" : job.status, steps: z.array(z.number().int().min(0).max(3)).catch([]).parse(job.steps), report: report.success ? report.data : null };
});
// Fallback when the database webhook cannot reach the worker: claim-once RPC guarantees a single run.
export const kickAuditReport = createServerFn({ method: "POST" }).inputValidator((v: unknown) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(v)).handler(async ({ data }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: job } = await supabaseAdmin.from("audit_report_jobs").select("id,callback_token,status,attempts").eq("report_token", data.token).maybeSingle();
  if (!job || job.status !== "pending" || job.attempts !== 0) return { started: false };
  const { processAuditReportJob } = await import("./audit-report-job.server");
  return { started: await processAuditReportJob(job.id, job.callback_token) };
});
