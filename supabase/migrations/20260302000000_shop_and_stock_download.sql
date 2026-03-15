-- Shop: allow customers to buy products (pick up in store or downloadable)
-- 1) Stock items: add download fields; allow public read of active items for shop
-- 2) Shop orders and items; RLS; RPCs for create and get by token

-- Stock items: downloadable products
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS is_downloadable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS download_url TEXT;

-- Public can view active stock items (for tenant shop display)
DROP POLICY IF EXISTS "Public can view active stock items" ON public.stock_items;
CREATE POLICY "Public can view active stock items"
  ON public.stock_items FOR SELECT
  USING (is_active = true);

-- Shop orders: customer order header
CREATE TABLE IF NOT EXISTS public.shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'ready_for_pickup', 'completed', 'cancelled')),
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  order_token UUID NOT NULL DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_orders_token ON public.shop_orders(order_token);
CREATE INDEX IF NOT EXISTS idx_shop_orders_tenant ON public.shop_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_created ON public.shop_orders(created_at DESC);

-- Shop order items: line items (snapshot name/price; optional download_url for digital)
CREATE TABLE IF NOT EXISTS public.shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_order_id UUID NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  download_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_order_items_order ON public.shop_order_items(shop_order_id);

-- Payments: link to shop order
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS shop_order_id UUID REFERENCES public.shop_orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_shop_order ON public.payments(shop_order_id);

-- Triggers
CREATE TRIGGER update_shop_orders_updated_at BEFORE UPDATE ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

-- Anyone can create a pending shop order (customer checkout)
DROP POLICY IF EXISTS "Anyone can create shop orders" ON public.shop_orders;
CREATE POLICY "Anyone can create shop orders"
  ON public.shop_orders FOR INSERT
  WITH CHECK (status = 'pending');

-- Anyone can add items to a pending order (only when creating)
DROP POLICY IF EXISTS "Anyone can create shop order items" ON public.shop_order_items;
CREATE POLICY "Anyone can create shop order items"
  ON public.shop_order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_orders o
      WHERE o.id = shop_order_items.shop_order_id AND o.status = 'pending'
    )
  );

-- Tenant admins can manage their shop orders
DROP POLICY IF EXISTS "Tenant admins can manage shop_orders" ON public.shop_orders;
CREATE POLICY "Tenant admins can manage shop_orders"
  ON public.shop_orders FOR ALL
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

DROP POLICY IF EXISTS "Tenant admins can manage shop_order_items" ON public.shop_order_items;
CREATE POLICY "Tenant admins can manage shop_order_items"
  ON public.shop_order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_orders o
      WHERE o.id = shop_order_items.shop_order_id
      AND (
        public.is_platform_admin(auth.uid()) OR
        public.has_tenant_role(auth.uid(), 'tenant_owner', o.tenant_id) OR
        public.has_tenant_role(auth.uid(), 'admin', o.tenant_id) OR
        public.has_tenant_role(auth.uid(), 'manager', o.tenant_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_orders o
      WHERE o.id = shop_order_items.shop_order_id
      AND (
        public.is_platform_admin(auth.uid()) OR
        public.has_tenant_role(auth.uid(), 'tenant_owner', o.tenant_id) OR
        public.has_tenant_role(auth.uid(), 'admin', o.tenant_id) OR
        public.has_tenant_role(auth.uid(), 'manager', o.tenant_id)
      )
    )
  );

-- RPC: get order by token (for customer order confirmation / download links)
CREATE OR REPLACE FUNCTION public.get_shop_order_by_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order RECORD;
  _items JSON;
BEGIN
  SELECT id, tenant_id, customer_name, customer_email, customer_phone, status, total, order_token, created_at
  INTO _order
  FROM public.shop_orders
  WHERE order_token = p_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT COALESCE(json_agg(json_build_object(
    'id', i.id, 'item_name', i.item_name, 'quantity', i.quantity, 'unit_price', i.unit_price, 'total', i.total, 'download_url', i.download_url
  )), '[]'::json)
  INTO _items
  FROM public.shop_order_items i
  WHERE i.shop_order_id = _order.id;
  RETURN json_build_object(
    'id', _order.id, 'tenant_id', _order.tenant_id, 'customer_name', _order.customer_name, 'customer_email', _order.customer_email,
    'customer_phone', _order.customer_phone, 'status', _order.status, 'total', _order.total, 'order_token', _order.order_token,
    'created_at', _order.created_at, 'items', _items
  );
END;
$$;

-- RPC: complete shop order after payment (mark paid; decrement stock; optionally link payment)
CREATE OR REPLACE FUNCTION public.complete_shop_order_payment(p_order_token UUID, p_payment_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id UUID;
  _tenant_id UUID;
  _item RECORD;
  _qty_before DECIMAL;
BEGIN
  SELECT id, tenant_id INTO _order_id, _tenant_id
  FROM public.shop_orders
  WHERE order_token = p_order_token AND status = 'pending';
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  UPDATE public.shop_orders
  SET status = 'paid', payment_id = p_payment_id, updated_at = now()
  WHERE id = _order_id;
  -- Decrement stock for each item (physical products)
  FOR _item IN
    SELECT oi.stock_item_id, oi.quantity
    FROM public.shop_order_items oi
    WHERE oi.shop_order_id = _order_id AND oi.stock_item_id IS NOT NULL
  LOOP
    SELECT quantity INTO _qty_before FROM public.stock_items WHERE id = _item.stock_item_id;
    IF FOUND AND _qty_before IS NOT NULL THEN
      UPDATE public.stock_items SET quantity = GREATEST(0, _qty_before - _item.quantity), updated_at = now() WHERE id = _item.stock_item_id;
      INSERT INTO public.stock_transactions (tenant_id, stock_item_id, quantity_delta, type, reference_type, reference_id, quantity_before, quantity_after)
      VALUES (_tenant_id, _item.stock_item_id, -_item.quantity, 'sale', 'shop_order', _order_id, _qty_before, GREATEST(0, _qty_before - _item.quantity));
    END IF;
  END LOOP;
  RETURN _order_id;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_shop_order_by_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shop_order_by_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_shop_order_payment(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.complete_shop_order_payment(UUID, UUID) TO authenticated;
