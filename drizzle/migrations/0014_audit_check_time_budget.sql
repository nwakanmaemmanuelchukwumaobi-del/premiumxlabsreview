CREATE OR REPLACE FUNCTION public.claim_audit_report_job(p_id uuid,p_callback text,p_lease uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 UPDATE public.audit_report_jobs SET lease_id=p_lease,lease_until=now()+interval '360 seconds',status='running',attempts=attempts+1,updated_at=now() WHERE id=p_id AND callback_token=p_callback AND status='pending' AND attempts=0;
 RETURN FOUND; END $$;
REVOKE ALL ON FUNCTION public.claim_audit_report_job(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_audit_report_job(uuid,text,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.wake_audit_report_job() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 PERFORM net.http_post(url:='https://premiumxlabs.com/api/public/audit-report-worker',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||NEW.callback_token),body:=jsonb_build_object('id',NEW.id),timeout_milliseconds:=360000);
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.wake_audit_report_job() FROM PUBLIC,anon,authenticated;