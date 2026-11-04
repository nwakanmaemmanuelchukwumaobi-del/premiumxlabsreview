ALTER TABLE public.audit_report_links ADD COLUMN expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days');
GRANT ALL ON public.audit_report_links TO service_role;