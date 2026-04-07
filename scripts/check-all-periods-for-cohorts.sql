-- Check ALL periods (1-4) for cohorts, not just Period 1
-- Run this in Supabase SQL Editor

SELECT 
    DATE_TRUNC('week', up.created_at)::text as cohort_week,
    COUNT(DISTINCT up.id) as cohort_size,
    -- Period 1: Days 7-14
    COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '7 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '14 days'
        THEN up.id
    END) as period_1_users,
    -- Period 2: Days 14-21
    COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '14 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '21 days'
        THEN up.id
    END) as period_2_users,
    -- Period 3: Days 21-28
    COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '21 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '28 days'
        THEN up.id
    END) as period_3_users,
    -- Period 4: Days 28-35
    COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '28 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '35 days'
        THEN up.id
    END) as period_4_users,
    ROUND(100.0 * COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '7 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '14 days'
        THEN up.id
    END) / COUNT(DISTINCT up.id), 1) as p1_retention_pct,
    ROUND(100.0 * COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '14 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '21 days'
        THEN up.id
    END) / COUNT(DISTINCT up.id), 1) as p2_retention_pct,
    ROUND(100.0 * COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '21 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '28 days'
        THEN up.id
    END) / COUNT(DISTINCT up.id), 1) as p3_retention_pct,
    ROUND(100.0 * COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '28 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '35 days'
        THEN up.id
    END) / COUNT(DISTINCT up.id), 1) as p4_retention_pct
FROM user_profiles up
LEFT JOIN analytics_events ae ON 
    ae.user_id = up.id
    AND ae.event_timestamp > up.created_at
    AND ae.user_id IS NOT NULL
WHERE up.created_at >= '2024-08-01'
  AND up.created_at <= NOW() - INTERVAL '35 days'  -- Only cohorts old enough for Period 4
GROUP BY DATE_TRUNC('week', up.created_at)
ORDER BY cohort_week DESC
LIMIT 20;

-- Specifically check briankane13's cohort (Oct 13 week)
SELECT 
    '2025-10-13' as cohort_week,
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
    END) as period_2_users,
    COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '21 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '28 days'
        THEN up.id
    END) as period_3_users,
    COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '28 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '35 days'
        THEN up.id
    END) as period_4_users
FROM user_profiles up
LEFT JOIN analytics_events ae ON 
    ae.user_id = up.id
    AND ae.event_timestamp > up.created_at
    AND ae.user_id IS NOT NULL
WHERE DATE_TRUNC('week', up.created_at)::text = '2025-10-13';

-- Check what the function returns
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




