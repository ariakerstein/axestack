-- Verify the cohort fix is working correctly
-- Run this in Supabase SQL Editor

-- 1. Test the function
SELECT 
    cohort_period,
    cohort_size,
    period_0,
    period_1,
    period_2,
    period_3,
    period_4,
    ROUND(100.0 * period_1 / NULLIF(period_0, 0), 1) as p1_pct,
    ROUND(100.0 * period_2 / NULLIF(period_0, 0), 1) as p2_pct,
    ROUND(100.0 * period_3 / NULLIF(period_0, 0), 1) as p3_pct,
    ROUND(100.0 * period_4 / NULLIF(period_0, 0), 1) as p4_pct
FROM get_cohort_analysis_data('week')
WHERE cohort_period >= '2025-10-01'
ORDER BY cohort_period DESC
LIMIT 10;

-- 2. Specifically check briankane13's cohort (Oct 13 week)
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

-- 3. Verify briankane13 is included and has Period 3/4 activity
WITH briankane AS (
    SELECT 
        up.id,
        up.created_at as signup_date,
        DATE_TRUNC('week', up.created_at)::date::text as cohort_week
    FROM user_profiles up
    WHERE up.email = 'briankane13@hotmail.com'
    LIMIT 1
)
SELECT 
    b.cohort_week,
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
    COUNT(*) as total_events
FROM briankane b
JOIN analytics_events ae ON 
    ae.user_id = b.id
    AND ae.event_timestamp > b.signup_date
    AND ae.user_id IS NOT NULL
GROUP BY b.cohort_week;




