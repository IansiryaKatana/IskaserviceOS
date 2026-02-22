import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/integrations/supabase/supabase-context";

export interface AuditLog {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function useAuditLogs(tenantId: string | null | undefined, limit = 50) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["audit-logs", tenantId ?? "platform", limit],
    queryFn: async () => {
      let q = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });
}
