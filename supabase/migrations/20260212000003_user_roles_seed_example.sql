-- ============================================================
-- Example: How to create user roles after user creation
-- ============================================================
-- This file shows examples of how to create user roles
-- Replace the UUIDs with your actual user IDs from auth.users
--
-- To find your user ID:
-- SELECT id, email FROM auth.users;
--
-- Then use one of the examples below or use the helper function:
-- SELECT create_user_role('<user-uuid>', 'platform_owner', NULL);
-- ============================================================

-- Example 1: Create a platform owner (can manage all tenants)
-- INSERT INTO public.user_roles (user_id, role, tenant_id)
-- VALUES ('<your-user-uuid>', 'platform_owner', NULL)
-- ON CONFLICT DO NOTHING;

-- Example 2: Create a tenant owner for Iska Saloon
-- INSERT INTO public.user_roles (user_id, role, tenant_id)
-- VALUES ('<your-user-uuid>', 'tenant_owner', '00000000-0000-0000-0000-000000000001')
-- ON CONFLICT DO NOTHING;

-- Example 3: Create an admin for a specific tenant
-- INSERT INTO public.user_roles (user_id, role, tenant_id)
-- VALUES ('<your-user-uuid>', 'admin', '00000000-0000-0000-0000-000000000001')
-- ON CONFLICT DO NOTHING;

-- Example 4: Create a manager for a specific tenant
-- INSERT INTO public.user_roles (user_id, role, tenant_id)
-- VALUES ('<your-user-uuid>', 'manager', '00000000-0000-0000-0000-000000000001')
-- ON CONFLICT DO NOTHING;

-- Example 5: Create a staff member for a specific tenant
-- INSERT INTO public.user_roles (user_id, role, tenant_id)
-- VALUES ('<your-user-uuid>', 'staff', '00000000-0000-0000-0000-000000000001')
-- ON CONFLICT DO NOTHING;

-- Example 6: Create a client for a specific tenant
-- INSERT INTO public.user_roles (user_id, role, tenant_id)
-- VALUES ('<your-user-uuid>', 'client', '00000000-0000-0000-0000-000000000001')
-- ON CONFLICT DO NOTHING;

-- ============================================================
-- Using the helper function (recommended):
-- ============================================================
-- SELECT create_user_role('<user-uuid>', 'platform_owner', NULL);
-- SELECT create_user_role('<user-uuid>', 'tenant_owner', '00000000-0000-0000-0000-000000000001');
-- SELECT create_user_role('<user-uuid>', 'admin', '00000000-0000-0000-0000-000000000001');
-- ============================================================
