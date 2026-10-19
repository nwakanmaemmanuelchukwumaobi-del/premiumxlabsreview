ALTER TABLE public.audit_requests ADD COLUMN online_links jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.audit_requests.links IS 'DEPRECATED: replaced by platform-labeled entries in online_links; retained for historical submissions';
COMMENT ON COLUMN public.audit_requests.online_links IS 'Separate online business links with platform, link, and optional other_name';