import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Payment {
  id: string;
  booking_id: string | null;
  tenant_id: string;
  client_id: string | null;
  stripe_payment_intent_id: string | null;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded";
  payment_method: string | null;
  metadata: any;
  refund_amount: number;
  refund_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function usePayments(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["payments", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*, bookings(*), clients(*)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!tenantId,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: {
      booking_id?: string | null;
      tenant_id: string;
      client_id?: string | null;
      amount: number;
      currency?: string;
      status?: Payment["status"];
      payment_method?: string | null;
      stripe_payment_intent_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("payments")
        .insert({
          booking_id: payment.booking_id || null,
          tenant_id: payment.tenant_id,
          client_id: payment.client_id || null,
          amount: payment.amount,
          currency: payment.currency || "usd",
          status: payment.status || "pending",
          payment_method: payment.payment_method || null,
          stripe_payment_intent_id: payment.stripe_payment_intent_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["payments", variables.tenant_id] });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Payment> & { id: string }) => {
      const { data, error } = await supabase
        .from("payments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["payments", data.tenant_id] });
    },
  });
}

export function usePaymentStats(tenantId: string | undefined, period: "day" | "week" | "month" = "month") {
  return useQuery({
    queryKey: ["payment-stats", tenantId, period],
    queryFn: async () => {
      if (!tenantId) return null;

      const now = new Date();
      let periodStart: Date;
      switch (period) {
        case "day":
          periodStart = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          periodStart = new Date(now);
          periodStart.setDate(now.getDate() - now.getDay());
          periodStart.setHours(0, 0, 0, 0);
          break;
        case "month":
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "succeeded")
        .gte("created_at", periodStart.toISOString());

      if (error) throw error;

      const payments = data || [];
      const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalRefunds = payments.reduce((sum, p) => sum + Number(p.refund_amount || 0), 0);

      return {
        totalRevenue,
        totalRefunds,
        netRevenue: totalRevenue - totalRefunds,
        paymentCount: payments.length,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}
