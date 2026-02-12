import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type AppRole = "admin" | "client" | "staff" | "platform_owner" | "tenant_owner" | "manager";

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  tenant_id: string | null;
}

export function useUserRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!user,
  });
}

export function useIsPlatformAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-platform-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc("is_platform_admin", { _user_id: user.id });
      if (error) return false;
      return data as boolean;
    },
    enabled: !!user,
  });
}

export function useHasRole(role: AppRole, tenantId?: string) {
  const { data: roles } = useUserRoles();
  if (!roles) return false;
  if (tenantId) {
    return roles.some(r => r.role === role && r.tenant_id === tenantId);
  }
  return roles.some(r => r.role === role);
}
