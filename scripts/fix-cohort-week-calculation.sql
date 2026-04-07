-- Debug the week calculation issue
-- Run this in Supabase SQL Editor

-- 1. Check briankane13's exact signup date and week calculation
SELECT 
    up.email,
    up.created_at,
    up.created_at::date as signup_date_only,
    DATE_TRUNC('week', up.created_at) as week_start_timestamp,
    DATE_TRUNC('week', up.created_at)::text as week_start_text,
    DATE_TRUNC('week', up.created_at)::date as week_start_date,
    EXTRACT(DOW FROM up.created_at) as day_of_week  -- 0=Sunday, 1=Monday, etc
FROM user_profiles up
WHERE up.email = 'briankane13@hotmail.com';

-- 2. Check all users in Oct 13 week with different date formats
SELECT 
    DATE_TRUNC('week', up.created_at)::text as cohort_week_text,
    DATE_TRUNC('week', up.created_at)::date as cohort_week_date,
    COUNT(*) as user_count,
    ARRAY_AGG(up.email ORDER BY up.created_at) as user_emails
FROM user_profiles up
WHERE up.created_at >= '2025-10-13'
  AND up.created_at < '2025-10-20'
GROUP BY DATE_TRUNC('week', up.created_at)
ORDER BY cohort_week_date;

-- 3. Check what the function is actually using
SELECT 
    cohort_period,
    cohort_size,
    period_0,
    period_1,
    period_2,
    period_3,
    period_4
FROM get_cohort_analysis_data('week')
WHERE cohort_period LIKE '2025-10%'
ORDER BY cohort_period;

-- 4. Check if there's a timezone issue
SELECT 
    'Current timezone' as setting,
    current_setting('timezone') as value
UNION ALL
SELECT 
    'Sample user created_at type',
    pg_typeof(created_at)::text
FROM user_profiles
LIMIT 1
UNION ALL
SELECT 
    'Sample event_timestamp type',
    pg_typeof(event_timestamp)::text
FROM analytics_events
LIMIT 1;

-- 5. Try matching with date casting
SELECT 
    DATE_TRUNC('week', up.created_at)::date::text as cohort_week,
    COUNT(DISTINCT up.id) as cohort_size
FROM user_profiles up
WHERE up.created_at >= '2025-10-13'::timestamp
  AND up.created_at < '2025-10-20'::timestamp
GROUP BY DATE_TRUNC('week', up.created_at)::date
ORDER BY cohort_week;




