-- Check briankane13's exact dates and period calculations
-- Run this in Supabase SQL Editor

WITH briankane AS (
    SELECT 
        up.id,
        up.email,
        up.created_at as signup_date,
        DATE_TRUNC('week', up.created_at)::text as cohort_week
    FROM user_profiles up
    WHERE up.email = 'briankane13@hotmail.com'
    LIMIT 1
)
SELECT 
    b.email,
    b.signup_date,
    b.cohort_week,
    -- Calculate exact period boundaries
    (b.signup_date + INTERVAL '7 days')::date as period_1_start,
    (b.signup_date + INTERVAL '14 days')::date as period_1_end,
    (b.signup_date + INTERVAL '14 days')::date as period_2_start,
    (b.signup_date + INTERVAL '21 days')::date as period_2_end,
    (b.signup_date + INTERVAL '21 days')::date as period_3_start,
    (b.signup_date + INTERVAL '28 days')::date as period_3_end,
    -- Count events in each period
    COUNT(CASE 
        WHEN ae.event_timestamp >= b.signup_date + INTERVAL '7 days'
         AND ae.event_timestamp < b.signup_date + INTERVAL '14 days'
        THEN 1
    END) as events_period_1,
    COUNT(CASE 
        WHEN ae.event_timestamp >= b.signup_date + INTERVAL '14 days'
         AND ae.event_timestamp < b.signup_date + INTERVAL '21 days'
        THEN 1
    END) as events_period_2,
    COUNT(CASE 
        WHEN ae.event_timestamp >= b.signup_date + INTERVAL '21 days'
         AND ae.event_timestamp < b.signup_date + INTERVAL '28 days'
        THEN 1
    END) as events_period_3,
    COUNT(CASE 
        WHEN ae.event_timestamp >= b.signup_date + INTERVAL '28 days'
         AND ae.event_timestamp < b.signup_date + INTERVAL '35 days'
        THEN 1
    END) as events_period_4,
    COUNT(*) as total_events_after_signup
FROM briankane b
LEFT JOIN analytics_events ae ON 
    ae.user_id = b.id
    AND ae.event_timestamp > b.signup_date
    AND ae.user_id IS NOT NULL
GROUP BY b.email, b.signup_date, b.cohort_week;

-- Show sample events with period classification
WITH briankane AS (
    SELECT 
        up.id,
        up.created_at as signup_date
    FROM user_profiles up
    WHERE up.email = 'briankane13@hotmail.com'
    LIMIT 1
)
SELECT 
    ae.event_timestamp,
    ae.event_type,
    EXTRACT(EPOCH FROM (ae.event_timestamp - b.signup_date)) / 86400 as days_after_signup,
    CASE 
        WHEN ae.event_timestamp < b.signup_date + INTERVAL '7 days' THEN 'Period 0 (Days 0-6)'
        WHEN ae.event_timestamp >= b.signup_date + INTERVAL '7 days'
         AND ae.event_timestamp < b.signup_date + INTERVAL '14 days' THEN 'Period 1 (Days 7-13) ✅'
        WHEN ae.event_timestamp >= b.signup_date + INTERVAL '14 days'
         AND ae.event_timestamp < b.signup_date + INTERVAL '21 days' THEN 'Period 2 (Days 14-20) ✅'
        WHEN ae.event_timestamp >= b.signup_date + INTERVAL '21 days'
         AND ae.event_timestamp < b.signup_date + INTERVAL '28 days' THEN 'Period 3 (Days 21-27) ✅'
        WHEN ae.event_timestamp >= b.signup_date + INTERVAL '28 days'
         AND ae.event_timestamp < b.signup_date + INTERVAL '35 days' THEN 'Period 4 (Days 28-34) ✅'
        ELSE 'Period 5+'
    END as period_classification
FROM briankane b
JOIN analytics_events ae ON 
    ae.user_id = b.id
    AND ae.event_timestamp > b.signup_date
    AND ae.user_id IS NOT NULL
ORDER BY ae.event_timestamp
LIMIT 20;

-- Check what the function returns for briankane's cohort
SELECT 
    cohort_period,
    cohort_size,
    period_0,
    period_1,
    period_2,
    period_3,
    period_4
FROM get_cohort_analysis_data('week')
WHERE cohort_period = '2025-10-13';




