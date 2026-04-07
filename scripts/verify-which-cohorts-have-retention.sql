-- Verify which cohorts should have non-zero retention
-- Run this in Supabase SQL Editor

-- 1. Find users who ARE active in Period 1 and their cohorts
SELECT 
    DATE_TRUNC('week', up.created_at)::text as cohort_week,
    COUNT(DISTINCT up.id) as users_in_cohort,
    COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '7 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '14 days'
        THEN up.id
    END) as users_with_period_1_activity,
    ROUND(100.0 * COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '7 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '14 days'
        THEN up.id
    END) / COUNT(DISTINCT up.id), 1) as period_1_retention_pct
FROM user_profiles up
LEFT JOIN analytics_events ae ON 
    ae.user_id = up.id
    AND ae.event_timestamp > up.created_at
    AND ae.user_id IS NOT NULL
WHERE up.created_at >= '2024-08-01'
  AND up.created_at <= NOW() - INTERVAL '14 days'  -- Only cohorts old enough for Period 1
GROUP BY DATE_TRUNC('week', up.created_at)
HAVING COUNT(DISTINCT CASE 
    WHEN ae.event_timestamp >= up.created_at + INTERVAL '7 days'
     AND ae.event_timestamp < up.created_at + INTERVAL '14 days'
    THEN up.id
END) > 0
ORDER BY cohort_week DESC;

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
WHERE cohort_period >= '2024-08-01'
ORDER BY cohort_period DESC;

-- 3. Check specific cohorts that should have data
-- Aug 31 - Sep 6 cohort
SELECT 
    'Aug 31 - Sep 6' as cohort_name,
    COUNT(DISTINCT up.id) as cohort_size,
    COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '7 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '14 days'
        THEN up.id
    END) as period_1_users,
    COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '14 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '21 days'
        THEN up.id
    END) as period_2_users
FROM user_profiles up
LEFT JOIN analytics_events ae ON 
    ae.user_id = up.id
    AND ae.event_timestamp > up.created_at
    AND ae.user_id IS NOT NULL
WHERE DATE_TRUNC('week', up.created_at)::text = '2024-09-02'  -- Aug 31 - Sep 6 week
GROUP BY DATE_TRUNC('week', up.created_at);

-- 4. Check if there's a date range issue - are events being filtered out?
SELECT 
    'Total events' as metric,
    COUNT(*) as count
FROM analytics_events
WHERE user_id IS NOT NULL
  AND event_timestamp >= '2024-08-01'
UNION ALL
SELECT 
    'Events after user signup' as metric,
    COUNT(*)
FROM analytics_events ae
JOIN user_profiles up ON ae.user_id = up.id
WHERE ae.user_id IS NOT NULL
  AND ae.event_timestamp > up.created_at
  AND up.created_at >= '2024-08-01'
  AND ae.event_timestamp >= '2024-08-01';

-- 5. Sample users from Aug 31 - Sep 6 cohort
SELECT 
    up.email,
    up.created_at as signup_date,
    COUNT(*) as total_events,
    COUNT(CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '7 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '14 days'
        THEN 1
    END) as events_period_1,
    MIN(ae.event_timestamp) as first_event,
    MAX(ae.event_timestamp) as last_event
FROM user_profiles up
LEFT JOIN analytics_events ae ON 
    ae.user_id = up.id
    AND ae.event_timestamp > up.created_at
    AND ae.user_id IS NOT NULL
WHERE DATE_TRUNC('week', up.created_at)::text = '2024-09-02'  -- Aug 31 - Sep 6
GROUP BY up.id, up.email, up.created_at
ORDER BY total_events DESC
LIMIT 5;




