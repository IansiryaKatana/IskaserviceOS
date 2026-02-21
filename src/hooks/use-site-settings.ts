import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSetting {
  id: string;
  key: string;
  value: string | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useSiteSettings(tenantId?: string | null) {
  return useQuery({
    queryKey: ["site-settings", tenantId],
    queryFn: async () => {
      let query = supabase.from("site_settings").select("*");
      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else {
        query = query.is("tenant_id", null);
      }
      const { data, error } = await query.order("key");
      if (error) throw error;
      return (data as SiteSetting[]) || [];
    },
  });
}

export function useSiteSetting(key: string, tenantId?: string | null) {
  return useQuery({
    queryKey: ["site-setting", key, tenantId],
    queryFn: async () => {
      let query = supabase.from("site_settings").select("*").eq("key", key);
      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else {
        query = query.is("tenant_id", null);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return (data as SiteSetting) || null;
    },
  });
}

export function useCreateSiteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (setting: Omit<SiteSetting, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("site_settings")
        .insert(setting)
        .select()
        .single();
      if (error) throw error;
      return data as SiteSetting;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["site-settings", variables.tenant_id] });
      qc.invalidateQueries({ queryKey: ["site-setting", variables.key, variables.tenant_id] });
    },
  });
}

export function useUpdateSiteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SiteSetting> & { id: string }) => {
      const { data, error } = await supabase
        .from("site_settings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as SiteSetting;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["site-settings", data.tenant_id] });
      qc.invalidateQueries({ queryKey: ["site-setting", data.key, data.tenant_id] });
    },
  });
}

export function useUpsertSiteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (setting: { key: string; value: string | null; tenant_id?: string | null }) => {
      // Check if exists
      let query = supabase.from("site_settings").select("id").eq("key", setting.key);
      if (setting.tenant_id) {
        query = query.eq("tenant_id", setting.tenant_id);
      } else {
        query = query.is("tenant_id", null);
      }
      const { data: existing } = await query.maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from("site_settings")
          .update({ value: setting.value })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as SiteSetting;
      } else {
        // Insert
        const { data, error } = await supabase
          .from("site_settings")
          .insert({ key: setting.key, value: setting.value, tenant_id: setting.tenant_id || null })
          .select()
          .single();
        if (error) throw error;
        return data as SiteSetting;
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["site-settings", data.tenant_id] });
      qc.invalidateQueries({ queryKey: ["site-setting", data.key, data.tenant_id] });
    },
  });
}

export function useDeleteSiteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_settings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });
}
