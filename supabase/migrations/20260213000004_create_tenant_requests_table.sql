-- Create tenant_requests table for callback/contact form submissions
CREATE TABLE IF NOT EXISTS public.tenant_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  message TEXT,
  business_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_requests_status ON public.tenant_requests(status);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_created ON public.tenant_requests(created_at);

-- Enable RLS
ALTER TABLE public.tenant_requests ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view/manage requests
CREATE POLICY "Platform admins can manage tenant requests" ON public.tenant_requests FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Anyone can create requests (public form)
CREATE POLICY "Anyone can create tenant requests" ON public.tenant_requests FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_tenant_requests_updated_at BEFORE UPDATE ON public.tenant_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
