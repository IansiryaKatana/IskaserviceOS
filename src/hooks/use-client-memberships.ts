import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/integrations/supabase/supabase-context";
import type { MembershipPlan } from "@/hooks/use-membership-plans";

export interface ClientMembership {
  id: string;
  client_id: string;
  membership_plan_id: string;
  status: "active" | "cancelled" | "expired";
  started_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  membership_plans?: MembershipPlan | null;
}

export function useClientMembership(clientId: string | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["client-membership", clientId],
    staleTime: 1 * 60 * 1000,
    queryFn: async (): Promise<ClientMembership | null> => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("client_memberships")
        .select("*, membership_plans(*)")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as ClientMembership | null;
    },
    enabled: !!clientId,
  });
}

export function useSetClientMembership() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      client_id: string;
      membership_plan_id: string;
      status?: "active" | "cancelled" | "expired";
      ends_at?: string | null;
    }) => {
      const { data: existing } = await supabase
        .from("client_memberships")
        .select("id")
        .eq("client_id", params.client_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("client_memberships")
          .update({
            membership_plan_id: params.membership_plan_id,
            status: params.status ?? "active",
            ends_at: params.ends_at ?? null,
          })
          .eq("client_id", params.client_id)
          .select()
          .single();
        if (error) throw error;
        return data as ClientMembership;
      }

      const { data, error } = await supabase
        .from("client_memberships")
        .insert({
          client_id: params.client_id,
          membership_plan_id: params.membership_plan_id,
          status: params.status ?? "active",
          ends_at: params.ends_at ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ClientMembership;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["client-membership", d.client_id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useRemoveClientMembership() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("client_memberships")
        .delete()
        .eq("client_id", clientId);
      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId) => {
      qc.invalidateQueries({ queryKey: ["client-membership", clientId] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
