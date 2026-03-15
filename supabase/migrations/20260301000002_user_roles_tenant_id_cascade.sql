-- Ensure user_roles.tenant_id FK has ON DELETE CASCADE so deleting a tenant auto-removes its role rows.
-- Safe to run: drops the existing FK and re-adds it with CASCADE (no data change).

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_tenant_id_fkey;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
