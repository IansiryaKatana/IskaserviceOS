
-- ============================================================
-- PHASE 0 STEP 2: Tables, tenant_id, RLS, functions, indexes
-- ============================================================

-- 2. TENANTS TABLE
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'salon',
  logo_url TEXT,
  favicon_url TEXT,
  theme_config JSONB DEFAULT '{
    "primary_color": "#000000",
    "accent_color": "#C9A227",
    "tag_color_a": "#7C6A0A",
    "tag_color_b": "#5C3B2E",
    "font_primary": "Inter Tight",
    "font_secondary": "Domine",
    "border_radius": "14px",
    "panel_position": "right"
  }'::jsonb,
  deployment_type TEXT NOT NULL DEFAULT 'hosted' CHECK (deployment_type IN ('hosted', 'external')),
  external_supabase_url TEXT,
  external_supabase_anon_key TEXT,
  custom_domain TEXT,
  subscription_plan TEXT DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 3. PLATFORM_ADMINS TABLE
CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 4. TENANT_SUBSCRIPTIONS TABLE
CREATE TABLE public.tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. TENANT_DEPLOYMENT_CONFIG TABLE
CREATE TABLE public.tenant_deployment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  deployment_type TEXT NOT NULL DEFAULT 'hosted',
  supabase_url TEXT,
  supabase_anon_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_deployment_config ENABLE ROW LEVEL SECURITY;

-- 6. SERVICE_CATEGORIES TABLE
CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  tag_color TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- 7. ADD tenant_id + metadata TO EXISTING TABLES
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id);

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.staff_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 8. CREATE DEFAULT TENANT + BACKFILL
INSERT INTO public.tenants (id, name, slug, business_type, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Iska Saloon', 'iska-saloon', 'salon', 'active');

UPDATE public.locations SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.services SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.staff SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.staff_schedules SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.bookings SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.site_settings SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.user_roles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- 9. SEED DEFAULT SERVICE CATEGORIES
INSERT INTO public.service_categories (tenant_id, name, slug, tag_color, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Barber', 'barber', '#3B82F6', 0),
  ('00000000-0000-0000-0000-000000000001', 'Salon', 'salon', '#EC4899', 1);

-- 10. HELPER FUNCTIONS

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT tenant_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id UUID, _role app_role, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND tenant_id = _tenant_id
  )
$$;

-- 11. TRIGGERS for new tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenant_subscriptions_updated_at BEFORE UPDATE ON public.tenant_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenant_deployment_config_updated_at BEFORE UPDATE ON public.tenant_deployment_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON public.service_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. DROP OLD RLS POLICIES
DROP POLICY IF EXISTS "Anyone can view active locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated users can manage locations" ON public.locations;
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can manage services" ON public.services;
DROP POLICY IF EXISTS "Anyone can view active staff" ON public.staff;
DROP POLICY IF EXISTS "Authenticated users can manage staff" ON public.staff;
DROP POLICY IF EXISTS "Anyone can view staff schedules" ON public.staff_schedules;
DROP POLICY IF EXISTS "Authenticated users can manage schedules" ON public.staff_schedules;
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can manage bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- 13. NEW TENANT-SCOPED RLS POLICIES

-- TENANTS
CREATE POLICY "Platform admins can manage all tenants" ON public.tenants FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "Tenant members can view own tenant" ON public.tenants FOR SELECT
  USING (id = public.get_user_tenant_id(auth.uid()));

-- PLATFORM_ADMINS
CREATE POLICY "Platform admins can manage platform_admins" ON public.platform_admins FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));

-- TENANT_SUBSCRIPTIONS
CREATE POLICY "Platform admins can manage all subscriptions" ON public.tenant_subscriptions FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "Tenant owners can view own subscriptions" ON public.tenant_subscriptions FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- TENANT_DEPLOYMENT_CONFIG
CREATE POLICY "Platform admins can manage deployment config" ON public.tenant_deployment_config FOR ALL
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "Tenant owners can view own deployment config" ON public.tenant_deployment_config FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- SERVICE_CATEGORIES
CREATE POLICY "Anyone can view active service categories" ON public.service_categories FOR SELECT
  USING (is_active = true);
CREATE POLICY "Tenant admins can manage service categories" ON public.service_categories FOR ALL
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id)
    OR public.has_tenant_role(auth.uid(), 'admin', tenant_id)
    OR public.has_tenant_role(auth.uid(), 'manager', tenant_id)
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id)
    OR public.has_tenant_role(auth.uid(), 'admin', tenant_id)
    OR public.has_tenant_role(auth.uid(), 'manager', tenant_id)
  );

-- LOCATIONS
CREATE POLICY "Anyone can view active locations" ON public.locations FOR SELECT USING (is_active = true);
CREATE POLICY "Tenant admins can manage locations" ON public.locations FOR ALL
  USING (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR public.has_tenant_role(auth.uid(), 'manager', tenant_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR public.has_tenant_role(auth.uid(), 'manager', tenant_id));

-- SERVICES
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Tenant admins can manage services" ON public.services FOR ALL
  USING (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR public.has_tenant_role(auth.uid(), 'manager', tenant_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR public.has_tenant_role(auth.uid(), 'manager', tenant_id));

-- STAFF
CREATE POLICY "Anyone can view active staff" ON public.staff FOR SELECT USING (is_active = true);
CREATE POLICY "Tenant admins can manage staff" ON public.staff FOR ALL
  USING (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR public.has_tenant_role(auth.uid(), 'manager', tenant_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR public.has_tenant_role(auth.uid(), 'manager', tenant_id));

-- STAFF_SCHEDULES
CREATE POLICY "Anyone can view staff schedules" ON public.staff_schedules FOR SELECT USING (true);
CREATE POLICY "Tenant admins can manage schedules" ON public.staff_schedules FOR ALL
  USING (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR public.has_tenant_role(auth.uid(), 'manager', tenant_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR public.has_tenant_role(auth.uid(), 'manager', tenant_id));

-- BOOKINGS
CREATE POLICY "Anyone can create bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR public.has_tenant_role(auth.uid(), 'manager', tenant_id) OR public.has_tenant_role(auth.uid(), 'staff', tenant_id));
CREATE POLICY "Tenant admins can manage bookings" ON public.bookings FOR ALL
  USING (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR public.has_tenant_role(auth.uid(), 'manager', tenant_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR public.has_tenant_role(auth.uid(), 'manager', tenant_id));

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tenant admins can view tenant profiles" ON public.profiles FOR SELECT
  USING (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- SITE_SETTINGS
CREATE POLICY "Anyone can view settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Tenant admins can manage settings" ON public.site_settings FOR ALL
  USING (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id));

-- USER_ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tenant owners and admins can manage roles" ON public.user_roles FOR ALL
  USING (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR public.has_tenant_role(auth.uid(), 'admin', tenant_id));

-- 14. INDEXES
CREATE INDEX IF NOT EXISTS idx_locations_tenant ON public.locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant ON public.services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_tenant ON public.staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_tenant ON public.staff_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON public.bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_settings_tenant ON public.site_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON public.user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_tenant ON public.service_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON public.tenant_subscriptions(tenant_id);
