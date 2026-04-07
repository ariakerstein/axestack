-- Analyze briankane13@hotmail.com activity and cohort calculation
-- Run this in Supabase SQL Editor

-- 1. Get user details and signup date
SELECT 
    up.id,
    up.email,
    up.created_at as signup_date,
    DATE_TRUNC('month', up.created_at)::text as cohort_month,
    DATE_TRUNC('week', up.created_at)::text as cohort_week
FROM user_profiles up
WHERE up.email = 'briankane13@hotmail.com';

-- 2. Calculate exact period boundaries
WITH user_info AS (
    SELECT 
        up.id,
        up.email,
        up.created_at as signup_date
    FROM user_profiles up
    WHERE up.email = 'briankane13@hotmail.com'
    LIMIT 1
)
SELECT 
    ui.signup_date,
    -- Period 0: Signup month (Oct 1 - Oct 31)
    DATE_TRUNC('month', ui.signup_date)::date as period_0_start,
    (DATE_TRUNC('month', ui.signup_date) + INTERVAL '1 month')::date as period_0_end,
    -- Period 1 (Month 1): 1 month after signup (Nov 17 - Dec 17)
    (ui.signup_date + INTERVAL '1 month')::date as period_1_start,
    (ui.signup_date + INTERVAL '2 months')::date as period_1_end,
    -- Period 2 (Month 2): 2 months after signup (Dec 17 - Jan 17)
    (ui.signup_date + INTERVAL '2 months')::date as period_2_start,
    (ui.signup_date + INTERVAL '3 months')::date as period_2_end
FROM user_info ui;

-- 3. Check all events and which period they fall into
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
    ae.page_path,
    ui.signup_date,
    EXTRACT(EPOCH FROM (ae.event_timestamp - ui.signup_date)) / 86400 as days_after_signup,
    CASE 
        WHEN ae.event_timestamp < ui.signup_date + INTERVAL '1 month' THEN 'Period 0 (Days 0-30)'
        WHEN ae.event_timestamp >= ui.signup_date + INTERVAL '1 month'
         AND ae.event_timestamp < ui.signup_date + INTERVAL '2 months' THEN 'Period 1 (Month 1)'
        WHEN ae.event_timestamp >= ui.signup_date + INTERVAL '2 months'
         AND ae.event_timestamp < ui.signup_date + INTERVAL '3 months' THEN 'Period 2 (Month 2)'
        ELSE 'Period 3+'
    END as period_category,
    CASE 
        WHEN ae.event_timestamp >= ui.signup_date + INTERVAL '1 month'
         AND ae.event_timestamp < ui.signup_date + INTERVAL '2 months' THEN '✅ IN PERIOD 1'
        ELSE '❌ NOT IN PERIOD 1'
    END as period_1_check
FROM user_info ui
JOIN analytics_events ae ON ae.user_id = ui.id
WHERE ae.user_id IS NOT NULL
ORDER BY ae.event_timestamp DESC
LIMIT 30;

-- 4. Count events by period
WITH user_info AS (
    SELECT 
        up.id,
        up.created_at as signup_date
    FROM user_profiles up
    WHERE up.email = 'briankane13@hotmail.com'
    LIMIT 1
)
SELECT 
    COUNT(*) as total_events,
    COUNT(CASE 
        WHEN ae.event_timestamp < ui.signup_date + INTERVAL '1 month' THEN 1
    END) as events_period_0,
    COUNT(CASE 
        WHEN ae.event_timestamp >= ui.signup_date + INTERVAL '1 month'
         AND ae.event_timestamp < ui.signup_date + INTERVAL '2 months' THEN 1
    END) as events_period_1,
    COUNT(CASE 
        WHEN ae.event_timestamp >= ui.signup_date + INTERVAL '2 months'
         AND ae.event_timestamp < ui.signup_date + INTERVAL '3 months' THEN 1
    END) as events_period_2
FROM user_info ui
JOIN analytics_events ae ON ae.user_id = ui.id
WHERE ae.user_id IS NOT NULL;

-- 5. Check what the cohort function returns for this user's cohort
SELECT 
    cohort_period,
    cohort_size,
    period_0,
    period_1,
    period_2,
    period_3,
    period_4
FROM get_cohort_analysis_data('month')
WHERE cohort_period = (
    SELECT DATE_TRUNC('month', created_at)::text
    FROM user_profiles
    WHERE email = 'briankane13@hotmail.com'
);




