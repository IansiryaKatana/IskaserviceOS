-- Inventory: stock_items and stock_transactions
-- Phase 3 per PRD: Generic stock table for mechanic parts, salon products, spa oils, cleaning supplies

-- stock_items: products that can be sold or used
CREATE TABLE IF NOT EXISTS public.stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL, -- Optional link to services
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit TEXT DEFAULT 'each', -- each, box, bottle, kg, liter, etc.
  cost_price DECIMAL(10,2) DEFAULT 0,
  sell_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(12,2) DEFAULT 0,
  category TEXT, -- salon, spa, mechanic, cleaning, etc.
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_items_tenant_sku ON public.stock_items(tenant_id, sku) WHERE sku IS NOT NULL AND sku != '';
CREATE INDEX IF NOT EXISTS idx_stock_items_tenant ON public.stock_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON public.stock_items(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_stock_items_active ON public.stock_items(tenant_id) WHERE is_active = true;

-- stock_transactions: inventory movements (purchase, sale, adjustment, return)
CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  quantity_delta DECIMAL(12,2) NOT NULL, -- positive = in, negative = out
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment', 'return', 'transfer')),
  reference_type TEXT, -- pos_sale, manual, purchase_order, etc.
  reference_id UUID, -- pos_sale_id or other
  notes TEXT,
  quantity_before DECIMAL(12,2),
  quantity_after DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_transactions_tenant ON public.stock_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_item ON public.stock_transactions(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created ON public.stock_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_reference ON public.stock_transactions(reference_type, reference_id);

-- Enable RLS
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant admins can manage stock_items" ON public.stock_items FOR ALL
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

CREATE POLICY "Tenant admins can manage stock_transactions" ON public.stock_transactions FOR ALL
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

-- Triggers
CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON public.stock_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
