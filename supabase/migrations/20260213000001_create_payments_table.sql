-- Create payments table for Stripe integration
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  payment_method TEXT, -- card, cash, online, bank_transfer
  metadata JSONB DEFAULT '{}'::jsonb,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  refund_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON public.payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.payments(created_at);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant admins can manage payments" ON public.payments FOR ALL
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

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE clients.id = payments.client_id AND clients.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
