
-- STEP 1: Expand the app_role enum (must be committed separately)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant_owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
