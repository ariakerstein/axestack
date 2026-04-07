-- Check specific user activity and which cohort they belong to
-- Run this in Supabase SQL Editor

-- 1. Find your user and their cohort
SELECT 
    up.id,
    up.email,
    up.created_at as signup_date,
    DATE_TRUNC('week', up.created_at)::text as cohort_week,
    COUNT(*) as total_events_after_signup,
    COUNT(CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '7 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '14 days'
        THEN 1
    END) as events_period_1,
    COUNT(CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '14 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '21 days'
        THEN 1
    END) as events_period_2,
    COUNT(CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '21 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '28 days'
        THEN 1
    END) as events_period_3,
    COUNT(CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '28 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '35 days'
        THEN 1
    END) as events_period_4,
    MIN(ae.event_timestamp) as first_event_after_signup,
    MAX(ae.event_timestamp) as last_event
FROM user_profiles up
LEFT JOIN analytics_events ae ON 
    ae.user_id = up.id
    AND ae.event_timestamp > up.created_at
    AND ae.user_id IS NOT NULL
WHERE up.email ILIKE '%ariakerstein%'
GROUP BY up.id, up.email, up.created_at;

-- 2. Check your cohort's retention calculation
WITH your_cohort AS (
    SELECT 
        DATE_TRUNC('week', created_at)::text as cohort_key,
        COUNT(*) as cohort_size
    FROM user_profiles
    WHERE DATE_TRUNC('week', created_at) = (
        SELECT DATE_TRUNC('week', created_at)
        FROM user_profiles
        WHERE email ILIKE '%ariakerstein%'
        LIMIT 1
    )
    GROUP BY DATE_TRUNC('week', created_at)
)
SELECT 
    yc.cohort_key,
    yc.cohort_size,
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
    END) as period_3_users
FROM your_cohort yc
JOIN user_profiles up ON DATE_TRUNC('week', up.created_at)::text = yc.cohort_key
LEFT JOIN analytics_events ae ON 
    ae.user_id = up.id
    AND ae.event_timestamp > up.created_at
    AND ae.user_id IS NOT NULL
GROUP BY yc.cohort_key, yc.cohort_size;

-- 3. Check what the function returns for your cohort
SELECT 
    cohort_period,
    cohort_size,
    period_0,
    period_1,
    period_2,
    period_3,
    period_4,
    ROUND(100.0 * period_1 / NULLIF(period_0, 0), 1) as p1_pct,
    ROUND(100.0 * period_2 / NULLIF(period_0, 0), 1) as p2_pct
FROM get_cohort_analysis_data('week')
WHERE cohort_period = (
    SELECT DATE_TRUNC('week', created_at)::text
    FROM user_profiles
    WHERE email ILIKE '%ariakerstein%'
    LIMIT 1
);

-- 4. Check for any users being filtered out
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN email IS NULL THEN 1 END) as users_without_email,
    COUNT(CASE WHEN created_at IS NULL THEN 1 END) as users_without_signup_date,
    MIN(created_at) as earliest_signup,
    MAX(created_at) as latest_signup
FROM user_profiles;

-- 5. Find users with most activity (to find that "one user returning often")
SELECT 
    up.email,
    up.created_at as signup_date,
    DATE_TRUNC('week', up.created_at)::text as cohort_week,
    COUNT(*) as total_events,
    COUNT(DISTINCT DATE(ae.event_timestamp)) as active_days,
    MIN(ae.event_timestamp) as first_event,
    MAX(ae.event_timestamp) as last_event,
    EXTRACT(EPOCH FROM (MAX(ae.event_timestamp) - up.created_at)) / 86400 as days_since_signup
FROM user_profiles up
JOIN analytics_events ae ON 
    ae.user_id = up.id
    AND ae.event_timestamp > up.created_at
    AND ae.user_id IS NOT NULL
GROUP BY up.id, up.email, up.created_at
ORDER BY total_events DESC
LIMIT 10;




