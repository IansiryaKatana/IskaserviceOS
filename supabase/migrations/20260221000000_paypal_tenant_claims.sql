-- Store PayPal capture -> tenant mapping so we can claim the tenant when user lands on /onboarding?plan=...
-- Webhook creates tenant + subscription and inserts here; claim-paypal-tenant assigns the logged-in user by email.

CREATE TABLE IF NOT EXISTS public.paypal_tenant_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_capture_id TEXT NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_email TEXT,
  plan_type TEXT NOT NULL DEFAULT 'starter' CHECK (plan_type IN ('starter', 'lifetime')),
  claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paypal_tenant_claims_capture ON public.paypal_tenant_claims(paypal_capture_id);
CREATE INDEX IF NOT EXISTS idx_paypal_tenant_claims_email ON public.paypal_tenant_claims(customer_email);
CREATE INDEX IF NOT EXISTS idx_paypal_tenant_claims_unclaimed ON public.paypal_tenant_claims(customer_email, created_at) WHERE claimed_by_user_id IS NULL;

COMMENT ON TABLE public.paypal_tenant_claims IS 'Maps PayPal capture_id to tenant_id after webhook; claim-paypal-tenant assigns the logged-in user by email';
