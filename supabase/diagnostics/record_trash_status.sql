-- Run in the SQL editor of the SAME project configured by VITE_SUPABASE_URL.
-- Read-only checks: no records are deleted or changed.
SELECT
  to_regprocedure('public.manage_record_deletion(text,uuid,text)') IS NOT NULL AS trash_function_exists,
  to_regprocedure('public.save_service_composition(uuid,jsonb,jsonb)') IS NOT NULL AS service_function_exists,
  to_regclass('public.record_deletion_log') IS NOT NULL AS trash_audit_exists;

SELECT table_name, count(*) FILTER (WHERE column_name IN ('deleted_at','deleted_by')) AS trash_columns
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('budgets','contracts','schedules','people')
GROUP BY table_name ORDER BY table_name;

-- When trash_function_exists=false: apply migrations 0015 then 0016 as needed.
-- When all checks are present (true; 2 columns per table), refresh PostgREST:
-- NOTIFY pgrst, 'reload schema';

SELECT p.proname, p.proargnames, pg_get_function_identity_arguments(p.oid) AS arguments,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='manage_record_deletion';
