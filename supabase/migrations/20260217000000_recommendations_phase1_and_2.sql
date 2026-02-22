-- Phase 1 & 2: Tenant requests link, waitlist, gift cards, cancellation policy, no-show/cancel status

-- 1. Link tenant_requests to tenant (when converted)
ALTER TABLE public.tenant_requests
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_requests_tenant ON public.tenant_requests(tenant_id);

-- 2. Platform admins can update tenant_requests (status, notes, tenant_id)
DROP POLICY IF EXISTS "Platform admins can manage tenant requests" ON public.tenant_requests;
CREATE POLICY "Platform admins can manage tenant requests" ON public.tenant_requests FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- 3. Waitlist: when a slot is full, customer can join; we notify when slot opens
CREATE TABLE IF NOT EXISTS public.booking_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  desired_date DATE NOT NULL,
  desired_time_start TEXT,
  desired_time_end TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'expired', 'converted', 'cancelled')),
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant ON public.booking_waitlist(tenant_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.booking_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_desired ON public.booking_waitlist(tenant_id, desired_date);
ALTER TABLE public.booking_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant admins manage waitlist" ON public.booking_waitlist FOR ALL
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
CREATE POLICY "Anyone can insert waitlist" ON public.booking_waitlist FOR INSERT WITH CHECK (true);
CREATE TRIGGER update_booking_waitlist_updated_at BEFORE UPDATE ON public.booking_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Gift cards / vouchers
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  initial_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  purchaser_email TEXT,
  recipient_email TEXT,
  recipient_name TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_gift_cards_tenant ON public.gift_cards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON public.gift_cards(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON public.gift_cards(status);
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant admins manage gift cards" ON public.gift_cards FOR ALL
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
CREATE POLICY "Anyone can select active gift cards by code" ON public.gift_cards FOR SELECT
  USING (status = 'active' AND balance > 0);
CREATE TRIGGER update_gift_cards_updated_at BEFORE UPDATE ON public.gift_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Booking status: app will use 'cancelled', 'no_show' where needed (no constraint change here).

-- 6. Cancellation policy: store in site_settings (cancel_by_hours, no_show_after_minutes, no_show_fee_amount)
-- No new table; use site_settings key/values per tenant.

-- 7. Recurring bookings template (optional: recurrence_rule on service or separate table)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_membership BOOLEAN NOT NULL DEFAULT false;

-- 8. Location capacity (optional for multi-chair)
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE public.staff_schedules ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.staff_schedules ADD COLUMN IF NOT EXISTS block_reason TEXT;
