-- Align RLS with UI: treat platform_owner (Super Admin) as platform admin for all RLS checks.
-- Previously only platform_admins table was checked; now user_roles.role = 'platform_owner' (tenant_id NULL) also counts.

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id)
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'platform_owner' AND tenant_id IS NULL
  )
$$;
