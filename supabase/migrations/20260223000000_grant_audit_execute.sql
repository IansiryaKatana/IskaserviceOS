-- Allow authenticated users to call log_audit_event (INSERT is done inside the SECURITY DEFINER function)
GRANT EXECUTE ON FUNCTION public.log_audit_event(UUID, UUID, TEXT, TEXT, UUID, JSONB, TEXT, TEXT) TO authenticated;
