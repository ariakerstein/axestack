-- Check the actual function definition in the database
-- Run this in Supabase SQL Editor

-- 1. Check function signature
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type,
    prosrc as function_body
FROM pg_proc
WHERE proname = 'get_cohort_analysis_data';

-- 2. Try calling it directly to see the error
SELECT * FROM get_cohort_analysis_data('week') LIMIT 1;




