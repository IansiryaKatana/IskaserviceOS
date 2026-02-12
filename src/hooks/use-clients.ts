import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Client {
  id: string;
  tenant_id: string;
  user_id: string | null;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  preferences: any;
  notes: string | null;
  loyalty_points: number;
  total_spent: number;
  total_bookings: number;
  last_booking_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useClients(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["clients", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!tenantId,
  });
}

export function useClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("*, bookings(*, services(name), staff(name), locations(name))")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!clientId,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: {
      tenant_id: string;
      email?: string | null;
      phone?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      user_id?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("clients")
        .insert(client)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["clients", variables.tenant_id] });
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients", data.tenant_id] });
      qc.invalidateQueries({ queryKey: ["client", data.id] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tenantId }: { id: string; tenantId: string }) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["clients", variables.tenantId] });
    },
  });
}

// Find or create client by email/phone
export function useFindOrCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tenant_id,
      email,
      phone,
      first_name,
      last_name,
    }: {
      tenant_id: string;
      email?: string | null;
      phone?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    }) => {
      // Try to find existing client
      let query = supabase.from("clients").select("*").eq("tenant_id", tenant_id);
      
      if (email) {
        query = query.eq("email", email);
      } else if (phone) {
        query = query.eq("phone", phone);
      } else {
        throw new Error("Email or phone required");
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        // Update if new info provided
        if (first_name || last_name) {
          const { data, error } = await supabase
            .from("clients")
            .update({
              first_name: first_name || existing.first_name,
              last_name: last_name || existing.last_name,
            })
            .eq("id", existing.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        }
        return existing;
      }

      // Create new client
      const { data, error } = await supabase
        .from("clients")
        .insert({
          tenant_id,
          email,
          phone,
          first_name,
          last_name,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients", data.tenant_id] });
    },
  });
}
