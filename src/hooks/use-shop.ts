import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/integrations/supabase/supabase-context";
import { useStockItems } from "@/hooks/use-inventory";

export interface ShopOrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  download_url: string | null;
}

export interface ShopOrder {
  id: string;
  tenant_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  status: string;
  total: number;
  order_token: string;
  created_at: string;
  items: ShopOrderItem[];
}

/** Active stock items for the tenant (shop display). Uses same data as Admin but with public RLS for unauthenticated customers. */
export function useShopProducts(tenantId: string | undefined) {
  return useStockItems(tenantId, { activeOnly: true });
}

/** Create a pending shop order with items; returns order with order_token and total. */
export function useCreateShopOrder() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      tenant_id: string;
      customer_name: string;
      customer_email: string;
      customer_phone?: string | null;
      items: { stock_item_id: string; item_name: string; quantity: number; unit_price: number; total: number; download_url?: string | null }[];
    }) => {
      const total = params.items.reduce((sum, i) => sum + i.total, 0);
      const { data: order, error: orderErr } = await supabase
        .from("shop_orders")
        .insert({
          tenant_id: params.tenant_id,
          customer_name: params.customer_name,
          customer_email: params.customer_email,
          customer_phone: params.customer_phone ?? null,
          status: "pending",
          total,
        })
        .select("id, order_token, total")
        .single();
      if (orderErr || !order) throw orderErr || new Error("Failed to create order");
      const rows = params.items.map((i) => ({
        shop_order_id: order.id,
        stock_item_id: i.stock_item_id,
        item_name: i.item_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total: i.total,
        download_url: i.download_url ?? null,
      }));
      const { error: itemsErr } = await supabase.from("shop_order_items").insert(rows);
      if (itemsErr) throw itemsErr;
      return { ...order, total } as { id: string; order_token: string; total: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-order"] });
    },
  });
}

/** Get shop order by token (for confirmation page / download links). */
export function useShopOrderByToken(token: string | null) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["shop-order", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase.rpc("get_shop_order_by_token", { p_token: token });
      if (error) throw error;
      return data as ShopOrder | null;
    },
    enabled: !!token,
  });
}

/** Mark order as paid after successful payment (and decrement stock). */
export function useCompleteShopOrderPayment() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { order_token: string; payment_id?: string | null }) => {
      const { data, error } = await supabase.rpc("complete_shop_order_payment", {
        p_order_token: params.order_token,
        p_payment_id: params.payment_id ?? null,
      });
      if (error) throw error;
      return data as string | null;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["shop-order", variables.order_token] });
    },
  });
}
