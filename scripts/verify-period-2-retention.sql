-- Verify why Period 2 is showing zeros when we know there are users active
-- Run this in Supabase SQL Editor

-- 1. Check users active in Period 2 (days 14-21) by cohort
SELECT 
    DATE_TRUNC('week', up.created_at)::text as cohort_week,
    COUNT(DISTINCT up.id) as cohort_size,
    COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '14 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '21 days'
        THEN up.id
    END) as users_active_period_2,
    ROUND(100.0 * COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '14 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '21 days'
        THEN up.id
    END) / COUNT(DISTINCT up.id), 1) as period_2_retention_pct
FROM user_profiles up
LEFT JOIN analytics_events ae ON 
    ae.user_id = up.id
    AND ae.event_timestamp > up.created_at
    AND ae.user_id IS NOT NULL
WHERE up.created_at >= '2024-06-01'
  AND up.created_at <= NOW() - INTERVAL '21 days'  -- Only cohorts old enough for Period 2
GROUP BY DATE_TRUNC('week', up.created_at)
ORDER BY cohort_week DESC
LIMIT 10;

-- 2. Compare with function output
SELECT 
    cohort_period,
    cohort_size,
    period_0,
    period_1,
    period_2,
    ROUND(100.0 * period_1 / NULLIF(period_0, 0), 1) as p1_pct,
    ROUND(100.0 * period_2 / NULLIF(period_0, 0), 1) as p2_pct
FROM get_cohort_analysis_data('week')
WHERE cohort_period >= '2024-06-01'
ORDER BY cohort_period DESC
LIMIT 10;

-- 3. Check specific users from June cohorts who should have Period 2 activity
WITH june_cohorts AS (
    SELECT 
        up.id,
        up.created_at,
        DATE_TRUNC('week', up.created_at)::text as cohort_week
    FROM user_profiles up
    WHERE DATE_TRUNC('week', up.created_at)::text IN (
        '2024-06-17',  -- Jun 15-21
        '2024-06-24',  -- Jun 22-28
        '2024-07-01',  -- Jun 29 - Jul 5
        '2024-07-08'   -- Jul 6-12
    )
)
SELECT 
    jc.cohort_week,
    jc.id as user_id,
    jc.created_at as signup_date,
    COUNT(CASE 
        WHEN ae.event_timestamp >= jc.created_at + INTERVAL '7 days'
         AND ae.event_timestamp < jc.created_at + INTERVAL '14 days'
        THEN 1
    END) as events_period_1,
    COUNT(CASE 
        WHEN ae.event_timestamp >= jc.created_at + INTERVAL '14 days'
         AND ae.event_timestamp < jc.created_at + INTERVAL '21 days'
        THEN 1
    END) as events_period_2,
    COUNT(CASE 
        WHEN ae.event_timestamp >= jc.created_at + INTERVAL '21 days'
         AND ae.event_timestamp < jc.created_at + INTERVAL '28 days'
        THEN 1
    END) as events_period_3
FROM june_cohorts jc
LEFT JOIN analytics_events ae ON 
    ae.user_id = jc.id
    AND ae.event_timestamp > jc.created_at
    AND ae.user_id IS NOT NULL
GROUP BY jc.cohort_week, jc.id, jc.created_at
HAVING COUNT(CASE 
    WHEN ae.event_timestamp >= jc.created_at + INTERVAL '14 days'
     AND ae.event_timestamp < jc.created_at + INTERVAL '21 days'
    THEN 1
END) > 0
ORDER BY jc.cohort_week, jc.created_at;




