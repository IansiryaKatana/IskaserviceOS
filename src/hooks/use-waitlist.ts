import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/integrations/supabase/supabase-context";

export interface WaitlistEntry {
  id: string;
  tenant_id: string;
  location_id: string | null;
  staff_id: string | null;
  service_id: string | null;
  desired_date: string;
  desired_time_start: string | null;
  desired_time_end: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  status: "pending" | "notified" | "expired" | "converted" | "cancelled";
  notified_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useWaitlist(tenantId: string | undefined, filters?: { status?: string; date?: string }) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["waitlist", tenantId, filters?.status, filters?.date],
    staleTime: 1 * 60 * 1000,
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase
        .from("booking_waitlist")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.date) q = q.eq("desired_date", filters.date);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WaitlistEntry[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateWaitlistEntry() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      tenant_id: string;
      location_id?: string | null;
      staff_id?: string | null;
      service_id?: string | null;
      desired_date: string;
      desired_time_start?: string | null;
      desired_time_end?: string | null;
      customer_name: string;
      customer_email?: string | null;
      customer_phone: string;
    }) => {
      const { data, error } = await supabase
        .from("booking_waitlist")
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data as WaitlistEntry;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["waitlist", v.tenant_id] });
    },
  });
}

export function useUpdateWaitlistEntry() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WaitlistEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from("booking_waitlist")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as WaitlistEntry;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["waitlist", d.tenant_id] });
    },
  });
}
