-- Tenant owners and admins can update their own tenant (branding, name, slug, etc.)
CREATE POLICY "Tenant owners and admins can update own tenant"
ON public.tenants
FOR UPDATE
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = public.tenants.id
      AND ur.role IN ('tenant_owner', 'admin', 'manager')
  )
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = public.tenants.id
      AND ur.role IN ('tenant_owner', 'admin', 'manager')
  )
);
