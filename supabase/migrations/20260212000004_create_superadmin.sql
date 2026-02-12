-- ============================================================
-- Create superadmin for hello@iiankatana.com
-- ============================================================

DO $$
DECLARE
  _user_id uuid;
BEGIN
  -- Find user by email (try both variations in case of typo)
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = 'hello@iiankatana.com' OR email = 'hello@iankatana.com'
  LIMIT 1;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User with email hello@iiankatana.com or hello@iankatana.com not found. Please check the email address.';
  END IF;

  -- Add to platform_admins table if not already exists
  INSERT INTO public.platform_admins (user_id)
  SELECT _user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = _user_id
  );

  -- Create platform_owner role (superadmin) if it doesn't exist
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  SELECT _user_id, 'platform_owner', NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'platform_owner' AND tenant_id IS NULL
  );

  RAISE NOTICE 'Superadmin created successfully for user: %', _user_id;
END $$;
