-- ============================================================
-- Helper: Create user roles for existing users
-- ============================================================
-- This migration provides a function to easily create user roles
-- After creating a user via Supabase Auth, you can call:
-- SELECT create_user_role('<user-uuid>', 'platform_owner', NULL);
-- OR
-- SELECT create_user_role('<user-uuid>', 'tenant_owner', '<tenant-uuid>');

CREATE OR REPLACE FUNCTION public.create_user_role(
  _user_id uuid,
  _role public.app_role,
  _tenant_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role_id uuid;
BEGIN
  -- Check if role already exists
  SELECT id INTO _role_id
  FROM public.user_roles
  WHERE user_id = _user_id 
    AND role = _role 
    AND (tenant_id = _tenant_id OR (tenant_id IS NULL AND _tenant_id IS NULL));
  
  -- If role doesn't exist, create it
  IF _role_id IS NULL THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (_user_id, _role, _tenant_id)
    RETURNING id INTO _role_id;
  END IF;
  
  RETURN _role_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_role(uuid, public.app_role, uuid) TO authenticated;

-- ============================================================
-- Instructions for creating user roles:
-- ============================================================
-- 1. Create a user via Supabase Auth (or use existing user)
-- 2. Get the user's UUID from auth.users table
-- 3. Run one of these commands:
--
-- For Platform Owner (no tenant):
--   SELECT create_user_role('<user-uuid>', 'platform_owner', NULL);
--
-- For Tenant Owner:
--   SELECT create_user_role('<user-uuid>', 'tenant_owner', '<tenant-uuid>');
--
-- For Admin:
--   SELECT create_user_role('<user-uuid>', 'admin', '<tenant-uuid>');
--
-- For Manager:
--   SELECT create_user_role('<user-uuid>', 'manager', '<tenant-uuid>');
--
-- For Staff:
--   SELECT create_user_role('<user-uuid>', 'staff', '<tenant-uuid>');
--
-- For Client:
--   SELECT create_user_role('<user-uuid>', 'client', '<tenant-uuid>');
-- ============================================================
