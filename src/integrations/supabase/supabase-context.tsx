import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultClient } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useTenant } from "@/hooks/use-tenant";

type SupabaseClientType = SupabaseClient<Database>;

const SupabaseClientContext = createContext<SupabaseClientType | undefined>(undefined);

/**
 * Provides the tenant-aware Supabase client:
 * - Hosted tenants: main app Supabase client (default).
 * - External tenants: client for the tenant's own Supabase project (from tenant_deployment_config).
 * Must be rendered inside TenantProvider.
 */
export function SupabaseClientProvider({ children }: { children: ReactNode }) {
  const { tenantId, tenant } = useTenant();
  const [client, setClient] = useState<SupabaseClientType>(() => defaultClient);

  useEffect(() => {
    const isExternal =
      tenant?.deployment_type === "external" && tenantId && tenantId !== "00000000-0000-0000-0000-000000000001";

    if (!isExternal) {
      setClient(defaultClient);
      return;
    }

    let cancelled = false;
    defaultClient
      .from("tenant_deployment_config")
      .select("supabase_url, supabase_anon_key")
      .eq("tenant_id", tenantId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.supabase_url || !data?.supabase_anon_key) {
          setClient(defaultClient);
          return;
        }
        const url = (data as { supabase_url: string }).supabase_url;
        const key = (data as { supabase_anon_key: string }).supabase_anon_key;
        const externalClient = createClient<Database>(url, key, {
          auth: { persistSession: false },
        });
        setClient(externalClient);
      })
      .catch(() => {
        if (!cancelled) setClient(defaultClient);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, tenant?.deployment_type]);

  const value = useMemo(() => client, [client]);

  return (
    <SupabaseClientContext.Provider value={value}>
      {children}
    </SupabaseClientContext.Provider>
  );
}

/**
 * Returns the tenant-aware Supabase client (hosted = main DB, external = tenant's DB).
 * Use this in hooks that read/write tenant-scoped data (bookings, services, staff, etc.).
 * When used outside SupabaseClientProvider, falls back to the default client.
 */
export function useSupabase(): SupabaseClientType {
  const ctx = useContext(SupabaseClientContext);
  return ctx ?? defaultClient;
}
