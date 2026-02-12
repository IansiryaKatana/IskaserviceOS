import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StockItem {
  id: string;
  tenant_id: string;
  service_id: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  quantity: number;
  unit: string;
  cost_price: number;
  sell_price: number;
  min_stock: number;
  category: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StockTransaction {
  id: string;
  tenant_id: string;
  stock_item_id: string;
  quantity_delta: number;
  type: "purchase" | "sale" | "adjustment" | "return" | "transfer";
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  quantity_before: number | null;
  quantity_after: number | null;
  created_at: string;
}

export function useStockItems(tenantId: string | undefined, options?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: ["stock-items", tenantId, options?.activeOnly],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from("stock_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });
      if (options?.activeOnly) {
        query = query.eq("is_active", true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as StockItem[];
    },
    enabled: !!tenantId,
  });
}

export function useStockItem(itemId: string | undefined) {
  return useQuery({
    queryKey: ["stock-item", itemId],
    queryFn: async () => {
      if (!itemId) return null;
      const { data, error } = await supabase
        .from("stock_items")
        .select("*")
        .eq("id", itemId)
        .single();
      if (error) throw error;
      return data as StockItem;
    },
    enabled: !!itemId,
  });
}

export function useCreateStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      tenant_id: string;
      name: string;
      sku?: string | null;
      description?: string | null;
      quantity?: number;
      unit?: string;
      cost_price?: number;
      sell_price?: number;
      min_stock?: number;
      category?: string | null;
      service_id?: string | null;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("stock_items")
        .insert({
          tenant_id: item.tenant_id,
          name: item.name,
          sku: item.sku ?? null,
          description: item.description ?? null,
          quantity: item.quantity ?? 0,
          unit: item.unit ?? "each",
          cost_price: item.cost_price ?? 0,
          sell_price: item.sell_price ?? 0,
          min_stock: item.min_stock ?? 0,
          category: item.category ?? null,
          service_id: item.service_id ?? null,
          is_active: item.is_active ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["stock-items", variables.tenant_id] });
    },
  });
}

export function useUpdateStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StockItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("stock_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stock-items", data.tenant_id] });
      qc.invalidateQueries({ queryKey: ["stock-item", data.id] });
    },
  });
}

export function useDeleteStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tenantId }: { id: string; tenantId: string }) => {
      const { error } = await supabase.from("stock_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["stock-items", variables.tenantId] });
    },
  });
}

export function useStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      tenant_id: string;
      stock_item_id: string;
      quantity_delta: number;
      type: "purchase" | "sale" | "adjustment" | "return" | "transfer";
      notes?: string | null;
    }) => {
      const { data: item } = await supabase
        .from("stock_items")
        .select("quantity")
        .eq("id", params.stock_item_id)
        .single();
      if (!item) throw new Error("Stock item not found");
      const qtyBefore = Number(item.quantity);
      const qtyAfter = qtyBefore + params.quantity_delta;
      if (qtyAfter < 0) throw new Error("Insufficient stock");

      const { data: tx, error: txError } = await supabase
        .from("stock_transactions")
        .insert({
          tenant_id: params.tenant_id,
          stock_item_id: params.stock_item_id,
          quantity_delta: params.quantity_delta,
          type: params.type,
          notes: params.notes ?? null,
          quantity_before: qtyBefore,
          quantity_after: qtyAfter,
        })
        .select()
        .single();
      if (txError) throw txError;

      const { error: updateError } = await supabase
        .from("stock_items")
        .update({ quantity: qtyAfter })
        .eq("id", params.stock_item_id);
      if (updateError) throw updateError;

      return tx;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["stock-items", variables.tenant_id] });
      qc.invalidateQueries({ queryKey: ["stock-transactions", variables.stock_item_id] });
    },
  });
}

export function useStockTransactions(tenantId: string | undefined, stockItemId?: string) {
  return useQuery({
    queryKey: ["stock-transactions", tenantId, stockItemId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from("stock_transactions")
        .select("*, stock_items(name, sku)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (stockItemId) {
        query = query.eq("stock_item_id", stockItemId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as (StockTransaction & { stock_items?: { name: string; sku: string | null } })[];
    },
    enabled: !!tenantId,
  });
}
