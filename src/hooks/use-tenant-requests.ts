import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TenantRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  business_type: string | null;
  status: "pending" | "contacted" | "converted" | "rejected";
  notes: string | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Platform: list all tenant requests with optional status filter */
export function useTenantRequestsList(status?: TenantRequest["status"] | "") {
  return useQuery({
    queryKey: ["tenant-requests", status ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("tenant_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (status && status !== "") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TenantRequest[];
    },
  });
}

export function useUpdateTenantRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
      tenant_id,
    }: {
      id: string;
      status?: TenantRequest["status"];
      notes?: string | null;
      tenant_id?: string | null;
    }) => {
      const updates: Partial<TenantRequest> = {};
      if (status !== undefined) updates.status = status;
      if (notes !== undefined) updates.notes = notes;
      if (tenant_id !== undefined) updates.tenant_id = tenant_id;
      const { data, error } = await supabase
        .from("tenant_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as TenantRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-requests"] });
    },
  });
}

export function useCreateTenantRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request: {
      name: string;
      email: string;
      phone?: string | null;
      company?: string | null;
      message?: string | null;
      business_type?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("tenant_requests")
        .insert(request)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-requests"] });
    },
  });
}
