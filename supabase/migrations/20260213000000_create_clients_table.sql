-- Create clients table for better client management
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- Optional, for authenticated clients
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  preferences JSONB DEFAULT '{}'::jsonb, -- { favorite_services: [], favorite_staff: [], notes: "" }
  notes TEXT, -- Medical history, allergies, special requests
  loyalty_points INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  last_booking_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON public.clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_user ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_email ON public.clients(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone ON public.clients(tenant_id, phone);

-- Add client_id to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_client ON public.bookings(client_id);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant admins can manage clients" ON public.clients FOR ALL
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

CREATE POLICY "Users can view own client record" ON public.clients FOR SELECT
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
