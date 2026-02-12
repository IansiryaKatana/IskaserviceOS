-- ============================================================
-- Setup user_roles table and enum based on full schema
-- ============================================================

-- Create app_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin', 'client', 'staff', 'platform_owner', 'tenant_owner', 'manager'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant ON public.user_roles(user_id, tenant_id);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Tenant owners and admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Create RLS policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Tenant owners and admins can manage roles" ON public.user_roles FOR ALL
  USING (
    public.is_platform_admin(auth.uid()) 
    OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) 
    OR public.has_tenant_role(auth.uid(), 'admin', tenant_id)
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid()) 
    OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) 
    OR public.has_tenant_role(auth.uid(), 'admin', tenant_id)
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;
