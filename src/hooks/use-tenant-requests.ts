import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  created_at: string;
  updated_at: string;
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
