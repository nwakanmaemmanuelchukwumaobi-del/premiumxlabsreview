CREATE OR REPLACE FUNCTION public.enqueue_audit_report(p_audit uuid,p_token text,p_hash text,p_callback text,p_report jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE job_id uuid; BEGIN
 INSERT INTO public.audit_report_links(audit_id,token_hash,report,permanent) VALUES(p_audit,p_hash,p_report,true);
 INSERT INTO public.audit_report_jobs(audit_id,report_token,callback_token,report) VALUES(p_audit,p_token,p_callback,p_report) RETURNING id INTO job_id;
 RETURN job_id; END $$;
REVOKE ALL ON FUNCTION public.enqueue_audit_report(uuid,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_audit_report(uuid,text,text,text,jsonb) TO service_role;