-- Apply the cohort analysis migrations
-- This script combines the two migration files for creating the cohort analysis view

-- First migration: Create the cohort analysis view
-- From file: 20250103000005_create_cohort_analysis_view.sql

-- 1. Create a materialized view for cohort analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS public.cohort_analysis_data AS
WITH user_cohorts AS (
  -- Group users by signup week
  SELECT
    id as user_id,
    email,
    created_at,
    DATE_TRUNC('week', created_at) as cohort_week,
    DATE_TRUNC('month', created_at) as cohort_month
  FROM public.user_profiles
  WHERE created_at IS NOT NULL
),
user_activities AS (
  -- Get all user activities
  SELECT
    ae.user_id,
    ae.event_timestamp,
    DATE_TRUNC('week', ae.event_timestamp) as activity_week,
    DATE_TRUNC('month', ae.event_timestamp) as activity_month,
    EXTRACT(EPOCH FROM (ae.event_timestamp - uc.created_at))/86400 as days_since_signup
  FROM public.analytics_events ae
  JOIN user_cohorts uc ON ae.user_id = uc.user_id
  WHERE ae.user_id IS NOT NULL
),
weekly_cohorts AS (
  -- Calculate weekly cohort retention
  SELECT
    cohort_week,
    COUNT(DISTINCT user_id) as cohort_size,
    cohort_week as period_0,
    -- Period 1: Week 1
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_week = c.cohort_week)
     AND ua.activity_week = c.cohort_week + INTERVAL '1 week') as period_1,
    -- Period 2: Week 2
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_week = c.cohort_week)
     AND ua.activity_week = c.cohort_week + INTERVAL '2 weeks') as period_2,
    -- Period 3: Week 3
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_week = c.cohort_week)
     AND ua.activity_week = c.cohort_week + INTERVAL '3 weeks') as period_3,
    -- Period 4: Week 4
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_week = c.cohort_week)
     AND ua.activity_week = c.cohort_week + INTERVAL '4 weeks') as period_4
  FROM user_cohorts c
  GROUP BY cohort_week
),
monthly_cohorts AS (
  -- Calculate monthly cohort retention
  SELECT
    cohort_month,
    COUNT(DISTINCT user_id) as cohort_size,
    cohort_month as period_0,
    -- Period 1: Month 1
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_month = c.cohort_month)
     AND ua.activity_month = c.cohort_month + INTERVAL '1 month') as period_1,
    -- Period 2: Month 2
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_month = c.cohort_month)
     AND ua.activity_month = c.cohort_month + INTERVAL '2 months') as period_2,
    -- Period 3: Month 3
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_month = c.cohort_month)
     AND ua.activity_month = c.cohort_month + INTERVAL '3 months') as period_3,
    -- Period 4: Month 4
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_month = c.cohort_month)
     AND ua.activity_month = c.cohort_month + INTERVAL '4 months') as period_4
  FROM user_cohorts c
  GROUP BY cohort_month
)
-- Combine weekly and monthly data with type indicator
SELECT
  'weekly' as cohort_type,
  cohort_week as cohort_date,
  cohort_size,
  cohort_size as period_0,
  period_1,
  period_2,
  period_3,
  period_4
FROM weekly_cohorts
UNION ALL
SELECT
  'monthly' as cohort_type,
  cohort_month as cohort_date,
  cohort_size,
  cohort_size as period_0,
  period_1,
  period_2,
  period_3,
  period_4
FROM monthly_cohorts
ORDER BY cohort_date DESC;

-- 2. Create an index on the materialized view
CREATE INDEX IF NOT EXISTS idx_cohort_analysis_data_cohort_date
ON public.cohort_analysis_data(cohort_date);

CREATE INDEX IF NOT EXISTS idx_cohort_analysis_data_cohort_type
ON public.cohort_analysis_data(cohort_type);

-- 3. Grant access to the materialized view
GRANT SELECT ON public.cohort_analysis_data TO authenticated;
GRANT SELECT ON public.cohort_analysis_data TO service_role;

-- 4. Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_cohort_analysis_data()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.cohort_analysis_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant access to the refresh function
GRANT EXECUTE ON FUNCTION refresh_cohort_analysis_data() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_cohort_analysis_data() TO service_role;

-- 6. Create a function to get cohort data
CREATE OR REPLACE FUNCTION get_cohort_data(p_cohort_type text DEFAULT 'weekly')
RETURNS TABLE (
  cohort_date timestamp with time zone,
  cohort_size int,
  period_0 int,
  period_1 int,
  period_2 int,
  period_3 int,
  period_4 int
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cad.cohort_date,
    cad.cohort_size,
    cad.period_0,
    cad.period_1,
    cad.period_2,
    cad.period_3,
    cad.period_4
  FROM public.cohort_analysis_data cad
  WHERE cad.cohort_type = p_cohort_type
  ORDER BY cad.cohort_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant access to the get_cohort_data function
GRANT EXECUTE ON FUNCTION get_cohort_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cohort_data(text) TO service_role;

-- 8. Refresh the materialized view initially
SELECT refresh_cohort_analysis_data();

-- Second migration: Add daily cohort analysis
-- From file: 20250103000006_add_daily_cohort_analysis.sql

-- 1. Drop the existing materialized view
DROP MATERIALIZED VIEW IF EXISTS public.cohort_analysis_data;

-- 2. Recreate the materialized view with daily cohort support
CREATE MATERIALIZED VIEW IF NOT EXISTS public.cohort_analysis_data AS
WITH user_cohorts AS (
  -- Group users by signup cohort (day, week, month)
  SELECT
    id as user_id,
    email,
    created_at,
    DATE_TRUNC('day', created_at) as cohort_day,
    DATE_TRUNC('week', created_at) as cohort_week,
    DATE_TRUNC('month', created_at) as cohort_month
  FROM public.user_profiles
  WHERE created_at IS NOT NULL
),
user_activities AS (
  -- Get all user activities
  SELECT
    ae.user_id,
    ae.event_timestamp,
    DATE_TRUNC('day', ae.event_timestamp) as activity_day,
    DATE_TRUNC('week', ae.event_timestamp) as activity_week,
    DATE_TRUNC('month', ae.event_timestamp) as activity_month,
    EXTRACT(EPOCH FROM (ae.event_timestamp - uc.created_at))/86400 as days_since_signup
  FROM public.analytics_events ae
  JOIN user_cohorts uc ON ae.user_id = uc.user_id
  WHERE ae.user_id IS NOT NULL
),
daily_cohorts AS (
  -- Calculate daily cohort retention
  SELECT
    cohort_day,
    COUNT(DISTINCT user_id) as cohort_size,
    cohort_day as period_0,
    -- Period 1: Day 1 - activity on the next day
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_day = c.cohort_day)
     AND DATE_TRUNC('day', ua.event_timestamp) = c.cohort_day + INTERVAL '1 day') as period_1,
    -- Period 2: Day 2 - activity 2 days after signup
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_day = c.cohort_day)
     AND DATE_TRUNC('day', ua.event_timestamp) = c.cohort_day + INTERVAL '2 days') as period_2,
    -- Period 3: Day 3 - activity 3 days after signup
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_day = c.cohort_day)
     AND DATE_TRUNC('day', ua.event_timestamp) = c.cohort_day + INTERVAL '3 days') as period_3,
    -- Period 4: Day 4 - activity 4 days after signup
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_day = c.cohort_day)
     AND DATE_TRUNC('day', ua.event_timestamp) = c.cohort_day + INTERVAL '4 days') as period_4
  FROM user_cohorts c
  GROUP BY cohort_day
),
weekly_cohorts AS (
  -- Calculate weekly cohort retention
  SELECT
    cohort_week,
    COUNT(DISTINCT user_id) as cohort_size,
    cohort_week as period_0,
    -- Period 1: Week 1
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_week = c.cohort_week)
     AND ua.activity_week = c.cohort_week + INTERVAL '1 week') as period_1,
    -- Period 2: Week 2
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_week = c.cohort_week)
     AND ua.activity_week = c.cohort_week + INTERVAL '2 weeks') as period_2,
    -- Period 3: Week 3
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_week = c.cohort_week)
     AND ua.activity_week = c.cohort_week + INTERVAL '3 weeks') as period_3,
    -- Period 4: Week 4
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_week = c.cohort_week)
     AND ua.activity_week = c.cohort_week + INTERVAL '4 weeks') as period_4
  FROM user_cohorts c
  GROUP BY cohort_week
),
monthly_cohorts AS (
  -- Calculate monthly cohort retention
  SELECT
    cohort_month,
    COUNT(DISTINCT user_id) as cohort_size,
    cohort_month as period_0,
    -- Period 1: Month 1
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_month = c.cohort_month)
     AND ua.activity_month = c.cohort_month + INTERVAL '1 month') as period_1,
    -- Period 2: Month 2
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_month = c.cohort_month)
     AND ua.activity_month = c.cohort_month + INTERVAL '2 months') as period_2,
    -- Period 3: Month 3
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_month = c.cohort_month)
     AND ua.activity_month = c.cohort_month + INTERVAL '3 months') as period_3,
    -- Period 4: Month 4
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM user_activities ua 
     WHERE ua.user_id IN (SELECT user_id FROM user_cohorts WHERE cohort_month = c.cohort_month)
     AND ua.activity_month = c.cohort_month + INTERVAL '4 months') as period_4
  FROM user_cohorts c
  GROUP BY cohort_month
)
-- Combine daily, weekly and monthly data with type indicator
SELECT
  'daily' as cohort_type,
  cohort_day as cohort_date,
  cohort_size,
  cohort_size as period_0,
  period_1,
  period_2,
  period_3,
  period_4
FROM daily_cohorts
UNION ALL
SELECT
  'weekly' as cohort_type,
  cohort_week as cohort_date,
  cohort_size,
  cohort_size as period_0,
  period_1,
  period_2,
  period_3,
  period_4
FROM weekly_cohorts
UNION ALL
SELECT
  'monthly' as cohort_type,
  cohort_month as cohort_date,
  cohort_size,
  cohort_size as period_0,
  period_1,
  period_2,
  period_3,
  period_4
FROM monthly_cohorts
ORDER BY cohort_date DESC;

-- 3. Recreate the indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_cohort_analysis_data_cohort_date
ON public.cohort_analysis_data(cohort_date);

CREATE INDEX IF NOT EXISTS idx_cohort_analysis_data_cohort_type
ON public.cohort_analysis_data(cohort_type);

-- 4. Refresh the materialized view
SELECT refresh_cohort_analysis_data();
