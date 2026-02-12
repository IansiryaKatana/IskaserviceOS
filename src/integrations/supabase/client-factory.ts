import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from './client';
import type { Database } from './types';

/**
 * Get the appropriate Supabase client for a tenant
 * Returns the default client for hosted tenants, or creates a new client for external tenants
 */
export async function getTenantClient(tenantId: string): Promise<SupabaseClient<Database>> {
  // Fetch tenant and deployment config
  const { data: tenant, error: tenantError } = await defaultClient
    .from('tenants')
    .select('deployment_type, tenant_deployment_config(*)')
    .eq('id', tenantId)
    .single();

  if (tenantError) {
    console.error('Error fetching tenant:', tenantError);
    return defaultClient; // Fallback to default
  }

  // If hosted, use default client
  if (tenant?.deployment_type === 'hosted' || !tenant?.deployment_type) {
    return defaultClient;
  }

  // If external, check for deployment config
  const deploymentConfig = (tenant as any)?.tenant_deployment_config;
  
  if (!deploymentConfig || !deploymentConfig.supabase_url || !deploymentConfig.supabase_anon_key) {
    console.warn('External tenant missing deployment config, using default client');
    return defaultClient;
  }

  // Create client for external Supabase instance
  // NOTE: Service role key should be stored encrypted and only used server-side
  // For now, we use anon key for client-side operations
  return createClient<Database>(
    deploymentConfig.supabase_url,
    deploymentConfig.supabase_anon_key,
    {
      auth: {
        persistSession: false, // External tenants shouldn't persist sessions in main app
      },
    }
  );
}

/**
 * Get tenant client synchronously (for cases where tenant config is already loaded)
 */
export function createTenantClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Hook to get tenant-aware client
 * This should be used in components that need to work with external tenants
 */
export function useTenantClient(tenantId: string | undefined) {
  // For now, we'll use the default client and let RLS handle tenant isolation
  // External client routing should be handled server-side via Edge Functions
  return defaultClient;
}
