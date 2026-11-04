import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { reportSchema } from "./google-audit";

export const getAuditReport = createServerFn({ method: "GET" }).inputValidator((v: unknown) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(v)).handler(async ({ data }) => {
  setResponseHeader("Cache-Control", "no-store");
  setResponseHeader("X-Robots-Tag", "noindex, nofollow");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { hashValue } = await import("./audit-cache.server");
  const { data: row, error } = await supabaseAdmin.from("audit_report_links").select("report,expires_at").eq("token_hash", await hashValue(data.token)).eq("revoked", false).maybeSingle();
  if (error || !row || new Date(row.expires_at).getTime() <= Date.now() || !Number.isFinite(new Date(row.expires_at).getTime())) return null;
  const parsed = reportSchema.safeParse(row.report);
  return parsed.success ? parsed.data : null;
});