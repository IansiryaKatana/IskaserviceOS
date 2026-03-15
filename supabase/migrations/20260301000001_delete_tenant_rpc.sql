-- delete_tenant(p_tenant_id): platform admin only; deletes tenant and all dependent rows.
-- Parameter is p_tenant_id to avoid ambiguous "tenant_id" (parameter vs column) in PL/pgSQL.
-- Run order: 20260301000000 (is_platform_admin), then this file, then 20260301000003 (FK cascades).
-- After first deploy, run in SQL Editor: NOTIFY pgrst, 'reload schema';
DROP FUNCTION IF EXISTS public.delete_tenant(UUID);

CREATE FUNCTION public.delete_tenant(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins can delete tenants.'
      USING errcode = 'P0001';
  END IF;

  -- Child tables (delete in dependency order so no FK blocks)
  BEGIN DELETE FROM public.pos_sale_items WHERE pos_sale_id IN (SELECT id FROM public.pos_sales WHERE tenant_id = p_tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.pos_sales WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.stock_transactions WHERE stock_item_id IN (SELECT id FROM public.stock_items WHERE tenant_id = p_tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.stock_items WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.client_memberships WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.membership_plans WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.gift_cards WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.booking_waitlist WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  DELETE FROM public.reviews WHERE tenant_id = p_tenant_id;
  DELETE FROM public.payments WHERE tenant_id = p_tenant_id;
  DELETE FROM public.clients WHERE tenant_id = p_tenant_id;
  UPDATE public.audit_logs SET tenant_id = NULL WHERE tenant_id = p_tenant_id;
  DELETE FROM public.bookings WHERE tenant_id = p_tenant_id;
  DELETE FROM public.staff_schedules WHERE staff_id IN (SELECT id FROM public.staff WHERE tenant_id = p_tenant_id);
  DELETE FROM public.staff WHERE tenant_id = p_tenant_id;
  DELETE FROM public.services WHERE tenant_id = p_tenant_id;
  DELETE FROM public.service_categories WHERE tenant_id = p_tenant_id;
  DELETE FROM public.locations WHERE tenant_id = p_tenant_id;
  DELETE FROM public.site_settings WHERE tenant_id = p_tenant_id;
  DELETE FROM public.profiles WHERE tenant_id = p_tenant_id;
  DELETE FROM public.user_roles WHERE tenant_id = p_tenant_id;
  UPDATE public.tenant_requests SET tenant_id = NULL WHERE tenant_id = p_tenant_id;
  DELETE FROM public.stripe_checkout_tenants WHERE tenant_id = p_tenant_id;
  DELETE FROM public.paypal_tenant_claims WHERE tenant_id = p_tenant_id;
  DELETE FROM public.tenant_deployment_config WHERE tenant_id = p_tenant_id;
  DELETE FROM public.tenant_subscriptions WHERE tenant_id = p_tenant_id;

  DELETE FROM public.tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant not found or already deleted.'
      USING errcode = 'P0002';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.delete_tenant(UUID) IS 'Platform admin only. Deletes a tenant and all dependent rows.';

GRANT EXECUTE ON FUNCTION public.delete_tenant(UUID) TO authenticated;
