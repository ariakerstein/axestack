-- Test the cohort analysis function to verify it's working correctly
-- Run this in Supabase SQL Editor after applying the migration

-- 1. Check if function exists
SELECT 
    proname as function_name,
    pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'get_cohort_analysis_data';

-- 2. Test the function with actual data
SELECT * FROM get_cohort_analysis_data('week') 
ORDER BY cohort_period DESC 
LIMIT 10;

-- 3. Verify the calculation manually for one cohort
-- Let's check a specific cohort and see if users have events in Period 1
WITH test_cohort AS (
    SELECT 
        DATE_TRUNC('week', created_at)::text as cohort_key,
        id as user_id,
        created_at as signup_date
    FROM user_profiles
    WHERE created_at >= NOW() - INTERVAL '3 months'
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    tc.cohort_key,
    tc.user_id,
    tc.signup_date,
    COUNT(CASE 
        WHEN ae.event_timestamp >= tc.signup_date + INTERVAL '7 days'
         AND ae.event_timestamp < tc.signup_date + INTERVAL '14 days'
        THEN 1 
    END) as events_in_period_1,
    COUNT(CASE 
        WHEN ae.event_timestamp >= tc.signup_date + INTERVAL '14 days'
         AND ae.event_timestamp < tc.signup_date + INTERVAL '21 days'
        THEN 1 
    END) as events_in_period_2,
    COUNT(*) as total_events_after_signup
FROM test_cohort tc
LEFT JOIN analytics_events ae ON 
    ae.user_id = tc.user_id
    AND ae.event_timestamp > tc.signup_date
    AND ae.user_id IS NOT NULL
GROUP BY tc.cohort_key, tc.user_id, tc.signup_date;

-- 4. Check overall retention stats
SELECT 
    'Period 1 Retention' as metric,
    COUNT(DISTINCT up.id) as total_users,
    COUNT(DISTINCT CASE 
        WHEN EXISTS (
            SELECT 1 FROM analytics_events ae
            WHERE ae.user_id = up.id
            AND ae.event_timestamp >= up.created_at + INTERVAL '7 days'
            AND ae.event_timestamp < up.created_at + INTERVAL '14 days'
            AND ae.user_id IS NOT NULL
        ) THEN up.id
    END) as users_with_period_1_activity,
    ROUND(100.0 * COUNT(DISTINCT CASE 
        WHEN EXISTS (
            SELECT 1 FROM analytics_events ae
            WHERE ae.user_id = up.id
            AND ae.event_timestamp >= up.created_at + INTERVAL '7 days'
            AND ae.event_timestamp < up.created_at + INTERVAL '14 days'
            AND ae.user_id IS NOT NULL
        ) THEN up.id
    END) / COUNT(DISTINCT up.id), 2) as retention_pct
FROM user_profiles up
WHERE up.created_at >= NOW() - INTERVAL '6 months'
  AND up.created_at <= NOW() - INTERVAL '14 days';  -- Only users old enough for Period 1




