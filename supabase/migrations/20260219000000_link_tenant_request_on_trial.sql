-- Link tenant_requests to tenant when user completes trial signup (same email).
-- Called from app after create_trial_tenant so Platform can see which request led to which tenant.

CREATE OR REPLACE FUNCTION public.link_tenant_request_to_tenant(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN;
  END IF;
  -- Only tenant_owner of this tenant can link
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND role = 'tenant_owner'
  ) THEN
    RAISE EXCEPTION 'Not authorized to link this tenant';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR trim(v_email) = '' THEN
    RETURN;
  END IF;
  UPDATE public.tenant_requests
  SET tenant_id = p_tenant_id, status = 'converted', updated_at = now()
  WHERE lower(trim(email)) = lower(trim(v_email))
    AND (tenant_id IS NULL OR tenant_id = p_tenant_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_tenant_request_to_tenant(UUID) TO authenticated;
