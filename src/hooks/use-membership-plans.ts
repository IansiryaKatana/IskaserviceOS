import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/integrations/supabase/supabase-context";

export interface MembershipPlan {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  billing_interval: "month" | "year" | "one_time";
  benefits: unknown;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useMembershipPlans(tenantId: string | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["membership-plans", tenantId],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MembershipPlan[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateMembershipPlan() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: {
      tenant_id: string;
      name: string;
      slug: string;
      description?: string | null;
      price?: number;
      billing_interval?: string;
      benefits?: unknown;
      is_active?: boolean;
      sort_order?: number;
    }) => {
      const { data, error } = await supabase
        .from("membership_plans")
        .insert({
          tenant_id: plan.tenant_id,
          name: plan.name,
          slug: plan.slug,
          description: plan.description ?? null,
          price: plan.price ?? 0,
          billing_interval: plan.billing_interval ?? "month",
          benefits: plan.benefits ?? [],
          is_active: plan.is_active ?? true,
          sort_order: plan.sort_order ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as MembershipPlan;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["membership-plans", v.tenant_id] });
    },
  });
}

export function useUpdateMembershipPlan() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MembershipPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from("membership_plans")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as MembershipPlan;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["membership-plans", d.tenant_id] });
    },
  });
}

export function useDeleteMembershipPlan() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await supabase.from("membership_plans").select("tenant_id").eq("id", id).single();
      const { error } = await supabase.from("membership_plans").delete().eq("id", id);
      if (error) throw error;
      return data as { tenant_id: string };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["membership-plans", d?.tenant_id] });
    },
  });
}
