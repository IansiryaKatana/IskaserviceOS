-- Store Stripe Checkout session -> tenant mapping so we can claim the tenant when user lands on /onboarding?session_id=...
-- Webhook creates tenant + subscription and inserts here; claim-stripe-tenant adds user_roles and returns tenant_id.

CREATE TABLE IF NOT EXISTS public.stripe_checkout_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_email TEXT,
  plan_type TEXT NOT NULL DEFAULT 'starter' CHECK (plan_type IN ('starter', 'lifetime')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_checkout_tenants_session ON public.stripe_checkout_tenants(stripe_session_id);

COMMENT ON TABLE public.stripe_checkout_tenants IS 'Maps Stripe Checkout session_id to tenant_id after webhook; claim-stripe-tenant assigns the logged-in user to the tenant';
