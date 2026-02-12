-- Seed inventory and POS data
-- Uses tenant Iska Saloon (00000000-0000-0000-0000-000000000001)
-- Idempotent: skips if tenant already has stock items

-- Stock items for salon (only if none exist for tenant)
INSERT INTO public.stock_items (tenant_id, name, sku, description, quantity, unit, cost_price, sell_price, min_stock, category, is_active)
SELECT * FROM (VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Professional Shampoo', 'SHP-001', 'Moisturizing shampoo for all hair types', 45::decimal, 'bottle', 4.50, 12, 5, 'salon', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Deep Conditioner', 'CON-001', 'Intensive repair conditioner', 38::decimal, 'bottle', 3.80, 10, 5, 'salon', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Hair Oil', 'OIL-001', 'Argan oil for shine and protection', 52::decimal, 'bottle', 2.50, 8, 3, 'salon', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Styling Gel', 'GEL-001', 'Strong hold styling gel', 60::decimal, 'tube', 1.20, 6, 10, 'salon', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Heat Protectant Spray', 'HPS-001', 'Protects hair from heat damage', 28::decimal, 'bottle', 5.00, 14, 5, 'salon', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Coloring Kit', 'COL-001', 'Permanent hair color kit', 15::decimal, 'box', 8.00, 25, 3, 'salon', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Scissors Set', 'SCI-001', 'Professional haircutting scissors', 6::decimal, 'each', 45.00, 120, 1, 'equipment', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Towel Pack', 'TWL-001', 'Salon towels 12-pack', 8::decimal, 'box', 18.00, 35, 2, 'supplies', true)
) AS v(tenant_id, name, sku, description, quantity, unit, cost_price, sell_price, min_stock, category, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.stock_items WHERE tenant_id = '00000000-0000-0000-0000-000000000001');

-- Stock transactions (initial purchase records)
INSERT INTO public.stock_transactions (tenant_id, stock_item_id, quantity_delta, type, notes, quantity_before, quantity_after)
SELECT
  si.tenant_id,
  si.id,
  si.quantity,
  'purchase',
  'Initial stock',
  0,
  si.quantity
FROM public.stock_items si
WHERE si.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND si.sku IN ('SHP-001', 'CON-001', 'OIL-001', 'GEL-001', 'HPS-001', 'COL-001', 'SCI-001', 'TWL-001')
  AND NOT EXISTS (SELECT 1 FROM public.stock_transactions st WHERE st.stock_item_id = si.id AND st.type = 'purchase');

-- Sample POS sales (walk-in, no client)
WITH sale1 AS (
  INSERT INTO public.pos_sales (tenant_id, total, subtotal, payment_method, status)
  VALUES ('00000000-0000-0000-0000-000000000001', 26, 26, 'cash', 'completed')
  RETURNING id
),
item1 AS (SELECT id FROM public.stock_items WHERE tenant_id = '00000000-0000-0000-0000-000000000001' AND sku = 'SHP-001' LIMIT 1),
item2 AS (SELECT id FROM public.stock_items WHERE tenant_id = '00000000-0000-0000-0000-000000000001' AND sku = 'CON-001' LIMIT 1)
INSERT INTO public.pos_sale_items (pos_sale_id, stock_item_id, item_name, quantity, unit_price, total)
SELECT * FROM (VALUES
  ((SELECT id FROM sale1), (SELECT id FROM item1), 'Professional Shampoo', 1::decimal, 12::decimal, 12::decimal),
  ((SELECT id FROM sale1), (SELECT id FROM item2), 'Deep Conditioner', 1::decimal, 10::decimal, 10::decimal)
) AS v(pos_sale_id, stock_item_id, item_name, quantity, unit_price, total)
WHERE v.pos_sale_id IS NOT NULL AND v.stock_item_id IS NOT NULL;

WITH sale2 AS (
  INSERT INTO public.pos_sales (tenant_id, total, subtotal, payment_method, status)
  VALUES ('00000000-0000-0000-0000-000000000001', 22, 22, 'card', 'completed')
  RETURNING id
),
item3 AS (SELECT id FROM public.stock_items WHERE tenant_id = '00000000-0000-0000-0000-000000000001' AND sku = 'OIL-001' LIMIT 1),
item4 AS (SELECT id FROM public.stock_items WHERE tenant_id = '00000000-0000-0000-0000-000000000001' AND sku = 'GEL-001' LIMIT 1)
INSERT INTO public.pos_sale_items (pos_sale_id, stock_item_id, item_name, quantity, unit_price, total)
SELECT * FROM (VALUES
  ((SELECT id FROM sale2), (SELECT id FROM item3), 'Hair Oil', 2::decimal, 8::decimal, 16::decimal),
  ((SELECT id FROM sale2), (SELECT id FROM item4), 'Styling Gel', 1::decimal, 6::decimal, 6::decimal)
) AS v(pos_sale_id, stock_item_id, item_name, quantity, unit_price, total)
WHERE v.pos_sale_id IS NOT NULL AND v.stock_item_id IS NOT NULL;

WITH sale3 AS (
  INSERT INTO public.pos_sales (tenant_id, total, subtotal, payment_method, status)
  VALUES ('00000000-0000-0000-0000-000000000001', 14, 14, 'cash', 'completed')
  RETURNING id
),
item5 AS (SELECT id FROM public.stock_items WHERE tenant_id = '00000000-0000-0000-0000-000000000001' AND sku = 'HPS-001' LIMIT 1)
INSERT INTO public.pos_sale_items (pos_sale_id, stock_item_id, item_name, quantity, unit_price, total)
SELECT (SELECT id FROM sale3), (SELECT id FROM item5), 'Heat Protectant Spray', 1, 14, 14
WHERE EXISTS (SELECT 1 FROM sale3) AND EXISTS (SELECT 1 FROM item5);
