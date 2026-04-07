-- Check if the cohort_analysis_data view exists
SELECT EXISTS (
   SELECT FROM pg_catalog.pg_class c
   JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
   AND c.relname = 'cohort_analysis_data'
);

-- Check the structure of the view
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cohort_analysis_data'
AND table_schema = 'public';

-- Check permissions on the view
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'cohort_analysis_data'
AND table_schema = 'public';

-- Check if the refresh function exists
SELECT EXISTS (
   SELECT FROM pg_catalog.pg_proc p
   JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
   AND p.proname = 'refresh_cohort_analysis_data'
);

-- Check who has permissions on the refresh function
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'refresh_cohort_analysis_data'
AND routine_schema = 'public';
