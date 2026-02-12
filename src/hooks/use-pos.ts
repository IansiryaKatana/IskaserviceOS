import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PosSale {
  id: string;
  tenant_id: string;
  client_id: string | null;
  total: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: string;
  status: "pending" | "completed" | "void" | "refunded";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PosSaleItem {
  id: string;
  pos_sale_id: string;
  stock_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface PosCartItem {
  stock_item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export function usePosSales(tenantId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["pos-sales", tenantId, limit],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("pos_sales")
        .select("*, clients(first_name, last_name, email), pos_sale_items(*)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId,
  });
}

export function useCompletePosSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      tenant_id: string;
      client_id?: string | null;
      items: PosCartItem[];
      payment_method?: string;
      notes?: string | null;
    }) => {
      if (!params.items.length) throw new Error("Cart is empty");

      const subtotal = params.items.reduce((sum, i) => sum + i.total, 0);
      const total = subtotal;

      const { data: sale, error: saleError } = await supabase
        .from("pos_sales")
        .insert({
          tenant_id: params.tenant_id,
          client_id: params.client_id ?? null,
          total,
          subtotal,
          tax_amount: 0,
          discount_amount: 0,
          payment_method: params.payment_method ?? "cash",
          status: "completed",
          notes: params.notes ?? null,
        })
        .select()
        .single();
      if (saleError) throw saleError;

      for (const item of params.items) {
        const { error: itemError } = await supabase.from("pos_sale_items").insert({
          pos_sale_id: sale.id,
          stock_item_id: item.stock_item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        });
        if (itemError) throw itemError;

        const { data: stockItem } = await supabase
          .from("stock_items")
          .select("quantity")
          .eq("id", item.stock_item_id)
          .single();
        if (!stockItem) continue;

        const qtyBefore = Number(stockItem.quantity);
        const qtyDelta = -item.quantity;
        const qtyAfter = qtyBefore + qtyDelta;
        if (qtyAfter < 0) throw new Error(`Insufficient stock for ${item.item_name}`);

        await supabase.from("stock_transactions").insert({
          tenant_id: params.tenant_id,
          stock_item_id: item.stock_item_id,
          quantity_delta: qtyDelta,
          type: "sale",
          reference_type: "pos_sale",
          reference_id: sale.id,
          quantity_before: qtyBefore,
          quantity_after: qtyAfter,
        });

        await supabase.from("stock_items").update({ quantity: qtyAfter }).eq("id", item.stock_item_id);
      }

      const { error: paymentError } = await supabase.from("payments").insert({
        tenant_id: params.tenant_id,
        client_id: params.client_id ?? null,
        pos_sale_id: sale.id,
        amount: total,
        currency: "usd",
        status: "succeeded",
        payment_method: params.payment_method ?? "cash",
        metadata: { source: "pos" },
      });
      if (paymentError) throw paymentError;

      if (params.client_id) {
        const { data: client } = await supabase.from("clients").select("total_spent").eq("id", params.client_id).single();
        if (client) {
          await supabase.from("clients").update({
            total_spent: Number(client.total_spent || 0) + total,
          }).eq("id", params.client_id);
        }
      }

      return sale;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pos-sales", data.tenant_id] });
      qc.invalidateQueries({ queryKey: ["payments", data.tenant_id] });
      qc.invalidateQueries({ queryKey: ["stock-items", data.tenant_id] });
    },
  });
}

export function usePosSaleStats(tenantId: string | undefined, period: "day" | "week" | "month" = "day") {
  return useQuery({
    queryKey: ["pos-sale-stats", tenantId, period],
    queryFn: async () => {
      if (!tenantId) return { count: 0, total: 0 };

      const now = new Date();
      let start: Date;
      switch (period) {
        case "day":
          start = new Date(now);
          start.setHours(0, 0, 0, 0);
          break;
        case "week":
          start = new Date(now);
          start.setDate(now.getDate() - now.getDay());
          start.setHours(0, 0, 0, 0);
          break;
        case "month":
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          start = new Date(now);
          start.setHours(0, 0, 0, 0);
      }

      const { data, error } = await supabase
        .from("pos_sales")
        .select("id, total")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("created_at", start.toISOString());

      if (error) throw error;
      const sales = data || [];
      return {
        count: sales.length,
        total: sales.reduce((sum, s) => sum + Number(s.total), 0),
      };
    },
    enabled: !!tenantId,
  });
}
