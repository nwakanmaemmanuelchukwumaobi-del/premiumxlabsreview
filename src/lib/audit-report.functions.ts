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
  if (!link || (!link.permanent && new Date(link.expires_at).getTime() <= Date.now())) return null;
  const { data: job } = await supabaseAdmin.from("audit_report_jobs").select("status,steps,report").eq("report_token", data.token).maybeSingle();
  if (!job) return null;
  const report = reportSchema.safeParse(job.report);
  return { status: job.status, steps: z.array(z.number().int().min(0).max(3)).catch([]).parse(job.steps), report: report.success ? report.data : null };
});