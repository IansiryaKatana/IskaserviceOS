import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  deployment_type: string;
  status: string;
  logo_url: string | null;
  favicon_url: string | null;
  custom_domain: string | null;
  subscription_plan: string | null;
  theme_config: Json | null;
  created_at: string;
  updated_at: string;
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

// All tenants (platform admin only)
export function useTenants() {
  return useQuery({
    queryKey: ["platform-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tenant[];
    },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tenant: {
      name: string;
      slug: string;
      business_type: string;
      deployment_type?: string;
      logo_url?: string | null;
      theme_config?: Json | null;
    }) => {
      const { data, error } = await supabase
        .from("tenants")
        .insert({
          name: tenant.name,
          slug: tenant.slug,
          business_type: tenant.business_type,
          deployment_type: tenant.deployment_type || "hosted",
          logo_url: tenant.logo_url || null,
          theme_config: tenant.theme_config || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tenant> & { id: string }) => {
      const { data, error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
  });
}

export function useTenantSubscriptions() {
  return useQuery({
    queryKey: ["platform-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TenantSubscription[];
    },
  });
}

// Platform stats
export function usePlatformStats() {
  return useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const [tenants, bookings, services, staff] = await Promise.all([
        supabase.from("tenants").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("services").select("id", { count: "exact", head: true }),
        supabase.from("staff").select("id", { count: "exact", head: true }),
      ]);
      return {
        totalTenants: tenants.count || 0,
        totalBookings: bookings.count || 0,
        totalServices: services.count || 0,
        totalStaff: staff.count || 0,
      };
    },
  });
}

// Platform Admins
export interface PlatformAdmin {
  id: string;
  user_id: string;
  created_at: string;
}

export function usePlatformAdmins() {
  return useQuery({
    queryKey: ["platform-admins"],
    queryFn: async () => {
      const { data: admins, error } = await supabase
        .from("platform_admins")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch user emails from auth.users via profiles
      const userIds = admins.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      
      return admins.map(admin => ({
        ...admin,
        profile: profiles?.find(p => p.user_id === admin.user_id) || null,
      })) as any[];
    },
  });
}

export function useCreatePlatformAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase
        .from("platform_admins")
        .insert({ user_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-admins"] });
    },
  });
}

export function useDeletePlatformAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_admins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-admins"] });
    },
  });
}

// Tenant Subscriptions CRUD
export function useCreateTenantSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (subscription: {
      tenant_id: string;
      plan: string;
      status?: string;
      stripe_customer_id?: string | null;
      stripe_subscription_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .insert({
          tenant_id: subscription.tenant_id,
          plan: subscription.plan,
          status: subscription.status || "active",
          stripe_customer_id: subscription.stripe_customer_id || null,
          stripe_subscription_id: subscription.stripe_subscription_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-subscriptions"] });
    },
  });
}

export function useUpdateTenantSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TenantSubscription> & { id: string }) => {
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-subscriptions"] });
    },
  });
}

export function useDeleteTenantSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-subscriptions"] });
    },
  });
}

// Tenant Deployment Config
export interface TenantDeploymentConfig {
  id: string;
  tenant_id: string;
  deployment_type: string;
  supabase_url: string | null;
  supabase_anon_key: string | null;
  created_at: string;
  updated_at: string;
}

export function useTenantDeploymentConfigs() {
  return useQuery({
    queryKey: ["platform-deployment-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_deployment_config")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TenantDeploymentConfig[];
    },
  });
}

export function useCreateTenantDeploymentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: {
      tenant_id: string;
      deployment_type: string;
      supabase_url?: string | null;
      supabase_anon_key?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("tenant_deployment_config")
        .insert({
          tenant_id: config.tenant_id,
          deployment_type: config.deployment_type,
          supabase_url: config.supabase_url || null,
          supabase_anon_key: config.supabase_anon_key || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-deployment-configs"] });
    },
  });
}

export function useUpdateTenantDeploymentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TenantDeploymentConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from("tenant_deployment_config")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-deployment-configs"] });
    },
  });
}

export function useDeleteTenantDeploymentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_deployment_config").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-deployment-configs"] });
    },
  });
}

// User Roles (Platform-level management)
export interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "client" | "staff" | "platform_owner" | "tenant_owner" | "manager";
  tenant_id: string | null;
}

export function useAllUserRoles() {
  return useQuery({
    queryKey: ["platform-user-roles"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch related data
      const userIds = [...new Set(roles.map(r => r.user_id))];
      const tenantIds = [...new Set(roles.map(r => r.tenant_id).filter(Boolean))];
      
      const [profiles, tenants] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
        tenantIds.length > 0 ? supabase.from("tenants").select("id, name").in("id", tenantIds) : { data: [] },
      ]);
      
      return roles.map(role => ({
        ...role,
        profiles: profiles.data?.find(p => p.user_id === role.user_id) || null,
        tenants: tenants.data?.find(t => t.id === role.tenant_id) || null,
      })) as any[];
    },
  });
}

export function useCreateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (role: {
      user_id: string;
      role: "admin" | "client" | "staff" | "platform_owner" | "tenant_owner" | "manager";
      tenant_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("user_roles")
        .insert({
          user_id: role.user_id,
          role: role.role,
          tenant_id: role.tenant_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-user-roles"] });
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UserRole> & { id: string }) => {
      const { data, error } = await supabase
        .from("user_roles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-user-roles"] });
    },
  });
}

export function useDeleteUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-user-roles"] });
    },
  });
}
