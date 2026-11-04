ALTER TABLE public.audit_requests ADD COLUMN IF NOT EXISTS offering_type text, ADD COLUMN IF NOT EXISTS main_offering text, ADD COLUMN IF NOT EXISTS main_service text, ADD COLUMN IF NOT EXISTS city text, ADD COLUMN IF NOT EXISTS state text, ADD COLUMN IF NOT EXISTS google_report jsonb;
CREATE TABLE public.audit_check_cache (key text PRIMARY KEY, payload jsonb, expires_at timestamptz, lease_id uuid, lease_until timestamptz);
GRANT ALL ON public.audit_check_cache TO service_role;
ALTER TABLE public.audit_check_cache ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.audit_report_links (token_hash text PRIMARY KEY, audit_id uuid NOT NULL REFERENCES public.audit_requests(id) ON DELETE CASCADE, report jsonb NOT NULL, revoked boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.audit_report_links TO service_role;
ALTER TABLE public.audit_report_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX audit_report_links_audit_idx ON public.audit_report_links(audit_id);
CREATE FUNCTION public.claim_audit_cache(p_key text, p_lease uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed boolean;
BEGIN
INSERT INTO public.audit_check_cache(key, lease_id, lease_until) VALUES (p_key,p_lease,now()+interval '150 seconds') ON CONFLICT(key) DO UPDATE SET lease_id=p_lease,lease_until=now()+interval '150 seconds' WHERE (audit_check_cache.expires_at IS NULL OR audit_check_cache.expires_at <= now()) AND (audit_check_cache.lease_until IS NULL OR audit_check_cache.lease_until <= now());
GET DIAGNOSTICS claimed = ROW_COUNT;
RETURN claimed;
END $$;
REVOKE ALL ON FUNCTION public.claim_audit_cache(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_audit_cache(text,uuid) TO service_role;