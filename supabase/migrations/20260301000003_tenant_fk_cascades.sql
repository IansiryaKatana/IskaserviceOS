-- Conclusive fix: set ON DELETE CASCADE (or SET NULL) on every FK pointing to tenants(id).
-- Run once; safe to re-run. Fixes direct deletes from tenants table and RPC delete_tenant.

DO $$
DECLARE
  r RECORD;
  on_del text;
BEGIN
  FOR r IN
    SELECT
      c.conrelid::regclass::text AS table_name,
      c.conname AS constraint_name
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.tenants'::regclass
      AND array_length(c.conkey, 1) = 1
      AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = c.conrelid AND a.attnum = c.conkey[1] AND NOT a.attisdropped) = 'tenant_id'
  LOOP
    on_del := CASE WHEN r.table_name::text ~ '(^|\.)(audit_logs|tenant_requests)$' THEN 'SET NULL' ELSE 'CASCADE' END;
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE ' || on_del, r.table_name, r.constraint_name);
    RAISE NOTICE '% -> ON DELETE %', r.constraint_name, on_del;
  END LOOP;
END
$$;
