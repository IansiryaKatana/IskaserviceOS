import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TenantThemeConfig {
  primary_color: string;
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
}

interface TenantCtx {
  tenant: Tenant | null;
  tenantId: string;
  loading: boolean;
  setTenantBySlug: (slug: string) => Promise<void>;
}

// Default tenant ID for backward compat
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const TenantContext = createContext<TenantCtx | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  // Load default tenant on mount
  useEffect(() => {
    loadTenant(DEFAULT_TENANT_ID);
  }, []);

  const loadTenant = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setTenant({
        ...data,
        theme_config: (data.theme_config as unknown as TenantThemeConfig) || getDefaultTheme(),
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
  };

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
      setTenant({
        ...data,
        theme_config: (data.theme_config as unknown as TenantThemeConfig) || getDefaultTheme(),
      });
    } catch (err) {
      console.error("Failed to load tenant by slug:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantId: tenant?.id || DEFAULT_TENANT_ID,
        loading,
        setTenantBySlug,
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
    accent_color: "#C9A227",
    tag_color_a: "#7C6A0A",
    tag_color_b: "#5C3B2E",
    font_primary: "Inter Tight",
    font_secondary: "Domine",
    border_radius: "14px",
    panel_position: "right",
  };
}
