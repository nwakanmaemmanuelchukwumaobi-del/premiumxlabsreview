CREATE TABLE public.audit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL, business_name text NOT NULL, email text NOT NULL, whatsapp text NOT NULL,
  industry_location text NOT NULL, links text, challenge text NOT NULL,
  running_ads text NOT NULL, ad_platform text, ad_spend text, screenshot_path text,
  report_preference text NOT NULL
);
GRANT ALL ON public.audit_requests TO service_role;
ALTER TABLE public.audit_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL, business_name text, contact text NOT NULL, service text NOT NULL, description text NOT NULL
);
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL, email text NOT NULL, phone text, message text NOT NULL
);
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;