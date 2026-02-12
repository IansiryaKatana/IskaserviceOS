-- POS: pos_sales and pos_sale_items
-- Point of Sale for selling inventory items, linked to payments and clients

-- pos_sales: sale header
CREATE TABLE IF NOT EXISTS public.pos_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'cash', -- cash, card, online, bank_transfer
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'void', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_sales_tenant ON public.pos_sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_client ON public.pos_sales(client_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_created ON public.pos_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_sales_status ON public.pos_sales(tenant_id, status);

-- pos_sale_items: line items
CREATE TABLE IF NOT EXISTS public.pos_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_sale_id UUID NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE SET NULL, -- null for ad-hoc/custom items
  item_name TEXT NOT NULL, -- denormalized for history
  quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale ON public.pos_sale_items(pos_sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_stock ON public.pos_sale_items(stock_item_id);

-- Add pos_sale_id to payments for linking
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS pos_sale_id UUID REFERENCES public.pos_sales(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_pos_sale ON public.payments(pos_sale_id);

-- Enable RLS
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sale_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant admins can manage pos_sales" ON public.pos_sales FOR ALL
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

CREATE POLICY "Tenant admins can manage pos_sale_items" ON public.pos_sale_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.pos_sales ps
      WHERE ps.id = pos_sale_items.pos_sale_id
      AND (
        public.is_platform_admin(auth.uid()) OR
        public.has_tenant_role(auth.uid(), 'tenant_owner', ps.tenant_id) OR
        public.has_tenant_role(auth.uid(), 'admin', ps.tenant_id) OR
        public.has_tenant_role(auth.uid(), 'manager', ps.tenant_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pos_sales ps
      WHERE ps.id = pos_sale_items.pos_sale_id
      AND (
        public.is_platform_admin(auth.uid()) OR
        public.has_tenant_role(auth.uid(), 'tenant_owner', ps.tenant_id) OR
        public.has_tenant_role(auth.uid(), 'admin', ps.tenant_id) OR
        public.has_tenant_role(auth.uid(), 'manager', ps.tenant_id)
      )
    )
  );

-- Triggers
CREATE TRIGGER update_pos_sales_updated_at BEFORE UPDATE ON public.pos_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
