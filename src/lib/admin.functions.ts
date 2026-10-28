import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { requireOwnerAccess } from "./admin-access";
export const getAuditSubmissions = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ offset: z.number().int().min(0) }).parse(value))
  .handler(async ({ context, data }) => {
    const { data: owner, error: roleError } = await context.supabase.rpc("is_audit_owner");
    requireOwnerAccess(owner, !!roleError);
    const { data: rows, error } = await context.supabase.from("audit_requests").select("id,created_at,name,business_name,email,whatsapp,industry_location,online_links,challenge,running_ads,ad_platforms,ad_platform_other,ad_spend,goals,goals_other,report_preference,screenshot_path,website_checks,instant_breakdown").order("created_at", { ascending: false }).range(data.offset, data.offset + 24);
    if (error) throw new Error("Could not load audit submissions.");
    const { data: profile } = await context.supabase.from("profiles").select("display_name").eq("id",context.userId).maybeSingle();
    return { rows: await Promise.all((rows ?? []).map(async row => {
      const { data: screenshot } = row.screenshot_path ? await context.supabase.storage.from("audit-screenshots").createSignedUrl(row.screenshot_path, 3600) : { data: null };
      return { ...row, screenshot_url: screenshot?.signedUrl ?? null };
    })), displayName: profile?.display_name ?? "" };
  });
export const saveOwnerProfile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ display_name: z.string().trim().max(100) }).parse(v))
  .handler(async ({ context, data }) => {
    const { data: owner, error: roleError } = await context.supabase.rpc("is_audit_owner");
    requireOwnerAccess(owner, !!roleError);
    const { error } = await context.supabase.from("profiles").upsert({ id: context.userId, ...data });
    if (error) throw new Error("Could not save your name.");
    return { ok: true };
  });