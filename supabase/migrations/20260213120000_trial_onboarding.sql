-- Trial, plan types, and onboarding support
-- Plans: free (15-day trial), starter ($45/mo), lifetime ($500)

-- tenant_subscriptions: trial and plan_type
ALTER TABLE public.tenant_subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free';

-- Update existing rows
UPDATE public.tenant_subscriptions SET plan_type = COALESCE(plan, 'free') WHERE plan_type IS NULL;

-- tenants: onboarding_status
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Constrain onboarding_status (idempotent)
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_onboarding_status_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_onboarding_status_check
  CHECK (onboarding_status IN ('pending', 'in_progress', 'completed'));

-- tenant_requests: optional link to tenant
ALTER TABLE public.tenant_requests
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Index for trial expiry checks
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_trial_ends_at
  ON public.tenant_subscriptions(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Self-service trial tenant creation (called after signup)
CREATE OR REPLACE FUNCTION public.create_trial_tenant(
  p_name TEXT,
  p_slug TEXT,
  p_business_type TEXT DEFAULT 'salon'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_trial_ends TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_name IS NULL OR trim(p_name) = '' OR p_slug IS NULL OR trim(p_slug) = '' THEN
    RAISE EXCEPTION 'Name and slug are required';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = lower(trim(p_slug))) THEN
    RAISE EXCEPTION 'This business URL is already taken. Please choose another.';
  END IF;

  v_trial_ends := now() + interval '15 days';

  INSERT INTO public.tenants (name, slug, business_type, deployment_type, status, subscription_plan, onboarding_status)
  VALUES (trim(p_name), lower(trim(p_slug)), COALESCE(NULLIF(trim(p_business_type), ''), 'salon'), 'hosted', 'active', 'free', 'pending')
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.tenant_subscriptions (tenant_id, plan, plan_type, status, trial_ends_at)
  VALUES (v_tenant_id, 'free', 'free', 'trialing', v_trial_ends);

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (v_user_id, 'tenant_owner', v_tenant_id);

  INSERT INTO public.tenant_deployment_config (tenant_id, deployment_type)
  VALUES (v_tenant_id, 'hosted');

  RETURN v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_trial_tenant TO authenticated;

-- Get current user's tenant subscription (for trial banner, etc.)
CREATE OR REPLACE FUNCTION public.get_my_tenant_subscription()
RETURNS TABLE (tenant_id UUID, plan TEXT, plan_type TEXT, status TEXT, trial_ends_at TIMESTAMPTZ)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ts.tenant_id, ts.plan, ts.plan_type, ts.status, ts.trial_ends_at
  FROM public.tenant_subscriptions ts
  JOIN public.user_roles ur ON ur.tenant_id = ts.tenant_id AND ur.user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_tenant_subscription TO authenticated;
