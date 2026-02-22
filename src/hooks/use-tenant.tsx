import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface TenantThemeConfig {
  primary_color: string;
  /** Text color on primary (selected buttons/cards). If not set, derived from primary luminance. */
  primary_foreground?: string;
  accent_color: string;
  tag_color_a: string;
  tag_color_b: string;
  font_primary: string;
  font_secondary: string;
  border_radius: string;
  panel_position: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  logo_url: string | null;
  favicon_url: string | null;
  theme_config: TenantThemeConfig;
  deployment_type: string;
  status: string;
  onboarding_status?: string | null;
}

interface TenantCtx {
  tenant: Tenant | null;
  tenantId: string;
  loading: boolean;
  /** True when tenant was resolved from custom domain (hostname), so "/" should show the booking page. */
  tenantLoadedByDomain: boolean;
  setTenantBySlug: (slug: string) => Promise<void>;
  /** Refetch current tenant (e.g. after updating branding in Admin). */
  refreshTenant: () => Promise<void>;
}

// Default tenant ID for backward compat
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const TenantContext = createContext<TenantCtx | undefined>(undefined);

const getMainDomain = () => (import.meta.env.VITE_APP_MAIN_DOMAIN ?? "").toString().trim();

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantLoadedByDomain, setTenantLoadedByDomain] = useState(false);

  const loadTenant = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      const rawTheme = (data.theme_config as unknown as Partial<TenantThemeConfig>) || {};
      setTenant({
        ...data,
        theme_config: { ...getDefaultTheme(), ...rawTheme },
      });
    } catch (err) {
      console.error("Failed to load tenant:", err);
      // Fall back to defaults
      setTenant({
        id: DEFAULT_TENANT_ID,
        name: "Iska Service OS",
        slug: "iska-service-os",
        business_type: "salon",
        logo_url: null,
        favicon_url: null,
        theme_config: getDefaultTheme(),
        deployment_type: "hosted",
        status: "active",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const setTenantBySlug = useCallback(async (slug: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        console.warn("No tenant found for slug:", slug);
        setTenant(null);
        return;
      }
      const rawTheme = (data.theme_config as unknown as Partial<TenantThemeConfig>) || {};
      setTenant({
        ...data,
        theme_config: { ...getDefaultTheme(), ...rawTheme },
      });
    } catch (err) {
      console.error("Failed to load tenant by slug:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // On custom domain: resolve tenant by host and set tenantLoadedByDomain. Otherwise load user's tenant or default.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    const main = getMainDomain();
    const isCustomDomain =
      !!main && host !== "localhost" && host !== "127.0.0.1" && host !== main;

    if (isCustomDomain) {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-tenant-by-domain?host=${encodeURIComponent(host)}`;
      setLoading(true);
      fetch(url)
        .then((r) => r.json())
        .then(async (data: { slug?: string }) => {
          if (data?.slug) {
            await setTenantBySlug(data.slug);
            setTenantLoadedByDomain(true);
          } else {
            loadTenant(DEFAULT_TENANT_ID);
          }
        })
        .catch(() => loadTenant(DEFAULT_TENANT_ID))
        .finally(() => setLoading(false));
      return;
    }

    if (!user) {
      loadTenant(DEFAULT_TENANT_ID);
      return;
    }
    const loadUserTenant = async () => {
      try {
        const { data: tid, error } = await supabase.rpc("get_user_tenant_id", { _user_id: user.id });
        if (!error && tid) {
          await loadTenant(tid);
          return;
        }
      } catch (_) {
        /* fallback to default */
      }
      loadTenant(DEFAULT_TENANT_ID);
    };
    loadUserTenant();
  }, [user?.id, loadTenant, setTenantBySlug]);

  const refreshTenant = useCallback(async () => {
    if (tenant?.id) await loadTenant(tenant.id);
  }, [tenant?.id, loadTenant]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantId: tenant?.id || DEFAULT_TENANT_ID,
        loading,
        tenantLoadedByDomain,
        setTenantBySlug,
        refreshTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}

function getDefaultTheme(): TenantThemeConfig {
  return {
    primary_color: "#000000",
    primary_foreground: "#ffffff",
    accent_color: "#C9A227",
    tag_color_a: "#7C6A0A",
    tag_color_b: "#5C3B2E",
    font_primary: "Inter Tight",
    font_secondary: "Domine",
    border_radius: "14px",
    panel_position: "right",
  };
}
