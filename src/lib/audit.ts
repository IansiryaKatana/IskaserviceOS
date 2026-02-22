import type { SupabaseClient } from "@supabase/supabase-js";

export interface LogAuditParams {
  tenantId: string | null;
  userId: string | null;
  action: string;
  tableName: string;
  recordId?: string | null;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Log an audit event via the database function.
 * Call after create/update/delete on important resources.
 */
export async function logAuditEvent(
  supabase: SupabaseClient,
  params: LogAuditParams
): Promise<void> {
  try {
    await supabase.rpc("log_audit_event", {
      p_tenant_id: params.tenantId,
      p_user_id: params.userId,
      p_action: params.action,
      p_table_name: params.tableName,
      p_record_id: params.recordId ?? null,
      p_changes: params.changes ?? null,
      p_ip_address: params.ipAddress ?? null,
      p_user_agent: params.userAgent ?? null,
    });
  } catch (err) {
    console.warn("Audit log failed:", err);
  }
}
