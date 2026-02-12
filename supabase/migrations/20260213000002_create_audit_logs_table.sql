-- Create audit_logs table for security and compliance
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id UUID,
  action TEXT NOT NULL, -- create, update, delete, view, login, logout
  table_name TEXT NOT NULL,
  record_id UUID,
  changes JSONB, -- { old: {...}, new: {...} }
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only platform admins and tenant owners can view audit logs
CREATE POLICY "Platform admins can view all audit logs" ON public.audit_logs FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Tenant owners can view own tenant audit logs" ON public.audit_logs FOR SELECT
  USING (
    public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR
    public.has_tenant_role(auth.uid(), 'admin', tenant_id)
  );

-- Function to log audit events (called from triggers or application code)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_tenant_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_changes JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    tenant_id, user_id, action, table_name, record_id, changes, ip_address, user_agent
  ) VALUES (
    p_tenant_id, p_user_id, p_action, p_table_name, p_record_id, p_changes, p_ip_address, p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;
