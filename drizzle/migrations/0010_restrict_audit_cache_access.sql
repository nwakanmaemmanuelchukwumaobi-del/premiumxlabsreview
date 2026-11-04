REVOKE ALL ON public.audit_check_cache FROM anon, authenticated;
REVOKE ALL ON public.audit_report_links FROM anon, authenticated;
GRANT ALL ON public.audit_check_cache TO service_role;
GRANT ALL ON public.audit_report_links TO service_role;