CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
ALTER TABLE public.audit_report_links ADD COLUMN IF NOT EXISTS permanent boolean NOT NULL DEFAULT false;
CREATE TABLE public.audit_report_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), audit_id uuid NOT NULL UNIQUE REFERENCES public.audit_requests(id), report_token text NOT NULL UNIQUE, callback_token text NOT NULL, status text NOT NULL DEFAULT 'pending', steps jsonb NOT NULL DEFAULT '[]'::jsonb, report jsonb, lease_id uuid, lease_until timestamptz, attempts integer NOT NULL DEFAULT 0, email_sent boolean NOT NULL DEFAULT false, owner_email_sent boolean NOT NULL DEFAULT false, failure text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.audit_report_jobs TO service_role;
ALTER TABLE public.audit_report_jobs ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.claim_audit_report_job(p_id uuid,p_callback text,p_lease uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 UPDATE public.audit_report_jobs SET lease_id=p_lease,lease_until=now()+interval '90 seconds',status='running',attempts=attempts+1,updated_at=now() WHERE id=p_id AND callback_token=p_callback AND status='pending' AND attempts=0;
 RETURN FOUND; END $$;
REVOKE ALL ON FUNCTION public.claim_audit_report_job(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_audit_report_job(uuid,text,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.wake_audit_report_job() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 PERFORM net.http_post(url:='https://premiumxlabs.com/api/public/audit-report-worker',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||NEW.callback_token),body:=jsonb_build_object('id',NEW.id),timeout_milliseconds:=120000);
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.wake_audit_report_job() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER wake_audit_report_job AFTER INSERT ON public.audit_report_jobs FOR EACH ROW EXECUTE FUNCTION public.wake_audit_report_job();