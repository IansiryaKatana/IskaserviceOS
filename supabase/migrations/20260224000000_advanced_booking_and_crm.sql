-- Advanced booking: buffer time on services; recurring placeholder
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS buffer_minutes integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.services.buffer_minutes IS 'Minutes of buffer after this service (blocks next slot from starting until buffer has passed).';

-- Optional: recurring (store rule on booking; app can create multiple bookings)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS parent_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_parent ON public.bookings(parent_booking_id);

-- CRM: client segments (tag-based) and membership plans
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL DEFAULT 0,
  billing_interval text NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month', 'year', 'one_time')),
  benefits jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_membership_plans_tenant ON public.membership_plans(tenant_id);
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members manage membership plans" ON public.membership_plans FOR ALL
  USING (
    public.is_platform_admin(auth.uid()) OR
    public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR
    public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR
    public.has_tenant_role(auth.uid(), 'manager', tenant_id)
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid()) OR
    public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR
    public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR
    public.has_tenant_role(auth.uid(), 'manager', tenant_id)
  );

CREATE POLICY "Anyone can view active membership plans" ON public.membership_plans FOR SELECT
  USING (is_active = true);

CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Client membership (which plan a client is on)
CREATE TABLE IF NOT EXISTS public.client_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  membership_plan_id uuid NOT NULL REFERENCES public.membership_plans(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_memberships_client ON public.client_memberships(client_id);
ALTER TABLE public.client_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members manage client memberships" ON public.client_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
      AND (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', c.tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', c.tenant_id) OR public.has_tenant_role(auth.uid(), 'manager', c.tenant_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
      AND (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', c.tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', c.tenant_id) OR public.has_tenant_role(auth.uid(), 'manager', c.tenant_id))
    )
  );

CREATE TRIGGER update_client_memberships_updated_at BEFORE UPDATE ON public.client_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
