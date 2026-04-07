-- Debug briankane13's cohort calculation
-- Run this in Supabase SQL Editor

-- 1. Get briankane13's details
SELECT 
    up.id,
    up.email,
    up.created_at as signup_date,
    DATE_TRUNC('week', up.created_at)::text as cohort_week,
    DATE_TRUNC('week', up.created_at)::date as cohort_week_start
FROM user_profiles up
WHERE up.email = 'briankane13@hotmail.com';

-- 2. Count their events by period
WITH user_info AS (
    SELECT 
        up.id,
        up.created_at as signup_date,
        DATE_TRUNC('week', up.created_at)::text as cohort_key
    FROM user_profiles up
    WHERE up.email = 'briankane13@hotmail.com'
    LIMIT 1
)
SELECT 
    ui.cohort_key,
    ui.signup_date,
    COUNT(*) as total_events,
    COUNT(CASE 
        WHEN ae.event_timestamp >= ui.signup_date + INTERVAL '7 days'
         AND ae.event_timestamp < ui.signup_date + INTERVAL '14 days'
        THEN 1
    END) as events_period_1,
    COUNT(CASE 
        WHEN ae.event_timestamp >= ui.signup_date + INTERVAL '14 days'
         AND ae.event_timestamp < ui.signup_date + INTERVAL '21 days'
        THEN 1
    END) as events_period_2,
    COUNT(CASE 
        WHEN ae.event_timestamp >= ui.signup_date + INTERVAL '21 days'
         AND ae.event_timestamp < ui.signup_date + INTERVAL '28 days'
        THEN 1
    END) as events_period_3,
    MIN(ae.event_timestamp) as first_event,
    MAX(ae.event_timestamp) as last_event,
    EXTRACT(EPOCH FROM (MAX(ae.event_timestamp) - ui.signup_date)) / 86400 as days_since_signup
FROM user_info ui
JOIN analytics_events ae ON 
    ae.user_id = ui.id
    AND ae.event_timestamp > ui.signup_date
    AND ae.user_id IS NOT NULL
GROUP BY ui.cohort_key, ui.signup_date;

-- 3. Check what the function returns for their cohort
SELECT 
    cohort_period,
    cohort_size,
    period_0,
    period_1,
    period_2,
    period_3,
    period_4
FROM get_cohort_analysis_data('week')
WHERE cohort_period = (
    SELECT DATE_TRUNC('week', created_at)::text
    FROM user_profiles
    WHERE email = 'briankane13@hotmail.com'
);

-- 4. Check if briankane13 is included in the cohort calculation
WITH briankane_cohort AS (
    SELECT 
        DATE_TRUNC('week', created_at)::text as cohort_key,
        ARRAY_AGG(id) as user_ids
    FROM user_profiles
    WHERE DATE_TRUNC('week', created_at) = (
        SELECT DATE_TRUNC('week', created_at)
        FROM user_profiles
        WHERE email = 'briankane13@hotmail.com'
    )
    GROUP BY DATE_TRUNC('week', created_at)
)
SELECT 
    bc.cohort_key,
    COUNT(DISTINCT up.id) as users_in_cohort,
    COUNT(DISTINCT CASE WHEN up.email = 'briankane13@hotmail.com' THEN up.id END) as briankane_included,
    COUNT(DISTINCT CASE 
        WHEN ae.event_timestamp >= up.created_at + INTERVAL '7 days'
         AND ae.event_timestamp < up.created_at + INTERVAL '14 days'
        THEN up.id
    END) as period_1_users
FROM briankane_cohort bc
JOIN user_profiles up ON DATE_TRUNC('week', up.created_at)::text = bc.cohort_key
LEFT JOIN analytics_events ae ON 
    ae.user_id = up.id
    AND ae.event_timestamp > up.created_at
    AND ae.user_id IS NOT NULL
GROUP BY bc.cohort_key;

-- 5. Show sample events for briankane13 with period classification
WITH user_info AS (
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
    EXTRACT(EPOCH FROM (ae.event_timestamp - ui.signup_date)) / 86400 as days_after_signup,
    CASE 
        WHEN ae.event_timestamp < ui.signup_date + INTERVAL '7 days' THEN 'Period 0 (Days 0-6)'
        WHEN ae.event_timestamp >= ui.signup_date + INTERVAL '7 days'
         AND ae.event_timestamp < ui.signup_date + INTERVAL '14 days' THEN 'Period 1 (Days 7-13) ✅'
        WHEN ae.event_timestamp >= ui.signup_date + INTERVAL '14 days'
         AND ae.event_timestamp < ui.signup_date + INTERVAL '21 days' THEN 'Period 2 (Days 14-20) ✅'
        WHEN ae.event_timestamp >= ui.signup_date + INTERVAL '21 days'
         AND ae.event_timestamp < ui.signup_date + INTERVAL '28 days' THEN 'Period 3 (Days 21-27) ✅'
        ELSE 'Period 4+'
    END as period_classification
FROM user_info ui
JOIN analytics_events ae ON 
    ae.user_id = ui.id
    AND ae.event_timestamp > ui.signup_date
    AND ae.user_id IS NOT NULL
ORDER BY ae.event_timestamp
LIMIT 20;




