import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { CACHE_HOURS, isFreshCache } from "./google-audit";

export async function hashValue(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
/** Durable lease prevents concurrent workers repeating the same paid checks. */
export async function cachedAuditCheck<T>(context: string, schema: z.ZodType<T>, work: () => Promise<T>, fallback: () => T, cacheable: (value: T) => boolean = () => true): Promise<T> {
  const key = await hashValue(context);
  try {
    const read = async () => {
      const { data, error } = await supabaseAdmin.from("audit_check_cache").select("payload,expires_at").eq("key", key).maybeSingle();
      if (error) throw new Error("Cache unavailable");
      const parsed = schema.safeParse(data?.payload);
      return parsed.success && isFreshCache(data?.expires_at) ? { value: parsed.data } : null;
    };
    const existing = await read();
    if (existing) return existing.value;
    const lease = crypto.randomUUID();
    const { data: claimed, error } = await supabaseAdmin.rpc("claim_audit_cache", { p_key: key, p_lease: lease });
    if (error) return fallback();
    if (!claimed) {
      for (let i = 0; i < 55; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const filled = await read(); if (filled) return filled.value;
      }
      return fallback();
    }
    try {
      const value = schema.parse(await work());
      if (cacheable(value)) {
        const { error: storeError } = await supabaseAdmin.from("audit_check_cache").update({ payload: JSON.parse(JSON.stringify(value)), expires_at: new Date(Date.now() + CACHE_HOURS * 3600000).toISOString(), lease_until: null }).eq("key", key).eq("lease_id", lease);
        if (storeError) console.error("Audit check cache could not be stored.");
      }
      return value;
    } catch { return fallback(); }
    finally {
      try {
        await supabaseAdmin.from("audit_check_cache").update({ lease_until: null }).eq("key", key).eq("lease_id", lease);
      } catch { console.error("Audit cache lease release failed; bounded lease will expire."); }
    }
  } catch { console.error("Audit cache unavailable; skipping repeated provider calls."); return fallback(); }
}