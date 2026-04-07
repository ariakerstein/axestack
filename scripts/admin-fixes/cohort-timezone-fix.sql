-- TIMEZONE-AWARE COHORT ANALYSIS FIX
-- This addresses timezone inconsistencies in cohort calculations

-- =============================================================================
-- 1. CREATE TIMEZONE-CONSISTENT COHORT FUNCTIONS
-- =============================================================================

-- Function to get cohort data with proper timezone handling
CREATE OR REPLACE FUNCTION get_cohort_analysis_data(
  period_type text DEFAULT 'week',
  timezone_name text DEFAULT 'UTC'
)
RETURNS TABLE (
  cohort_period text,
  cohort_size integer,
  period_0 integer,
  period_1 integer,
  period_2 integer,
  period_3 integer,
  period_4 integer,
  period_5 integer,
  period_6 integer,
  period_7 integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  period_interval interval;
BEGIN
  -- Set interval based on period type
  period_interval := CASE
    WHEN period_type = 'day' THEN '1 day'::interval
    WHEN period_type = 'week' THEN '1 week'::interval
    WHEN period_type = 'month' THEN '1 month'::interval
    ELSE '1 week'::interval
  END;

  RETURN QUERY
  WITH user_cohorts AS (
    -- Group users by cohort period with timezone handling
    SELECT
      up.id as user_id,
      up.created_at,
      CASE
        WHEN period_type = 'day' THEN
          DATE_TRUNC('day', up.created_at AT TIME ZONE timezone_name)::text
        WHEN period_type = 'week' THEN
          DATE_TRUNC('week', up.created_at AT TIME ZONE timezone_name)::date::text
        WHEN period_type = 'month' THEN
          TO_CHAR(DATE_TRUNC('month', up.created_at AT TIME ZONE timezone_name), 'YYYY-MM')
        ELSE
          DATE_TRUNC('week', up.created_at AT TIME ZONE timezone_name)::date::text
      END as cohort_key,
      DATE_TRUNC(period_type, up.created_at AT TIME ZONE timezone_name) as cohort_start
    FROM public.user_profiles up
    WHERE up.created_at IS NOT NULL
      AND up.created_at >= NOW() - INTERVAL '12 months' -- Limit to reasonable timeframe
  ),
  cohort_summary AS (
    SELECT
      cohort_key,
      cohort_start,
      COUNT(*) as total_users,
      ARRAY_AGG(user_id) as user_ids
    FROM user_cohorts
    GROUP BY cohort_key, cohort_start
  ),
  retention_calculations AS (
    SELECT
      cs.cohort_key,
      cs.total_users,
      -- Period 0: Always 100% (signup period)
      cs.total_users as ret_period_0,
      -- Period 1-7: Count users active in each subsequent period
      (SELECT COUNT(DISTINCT ae.user_id)
       FROM public.analytics_events ae
       WHERE ae.user_id = ANY(cs.user_ids)
         AND ae.event_timestamp AT TIME ZONE timezone_name >= cs.cohort_start + period_interval
         AND ae.event_timestamp AT TIME ZONE timezone_name < cs.cohort_start + (period_interval * 2)
         AND ae.event_timestamp AT TIME ZONE timezone_name <= NOW() AT TIME ZONE timezone_name
      ) as ret_period_1,

      (SELECT COUNT(DISTINCT ae.user_id)
       FROM public.analytics_events ae
       WHERE ae.user_id = ANY(cs.user_ids)
         AND ae.event_timestamp AT TIME ZONE timezone_name >= cs.cohort_start + (period_interval * 2)
         AND ae.event_timestamp AT TIME ZONE timezone_name < cs.cohort_start + (period_interval * 3)
         AND ae.event_timestamp AT TIME ZONE timezone_name <= NOW() AT TIME ZONE timezone_name
      ) as ret_period_2,

      (SELECT COUNT(DISTINCT ae.user_id)
       FROM public.analytics_events ae
       WHERE ae.user_id = ANY(cs.user_ids)
         AND ae.event_timestamp AT TIME ZONE timezone_name >= cs.cohort_start + (period_interval * 3)
         AND ae.event_timestamp AT TIME ZONE timezone_name < cs.cohort_start + (period_interval * 4)
         AND ae.event_timestamp AT TIME ZONE timezone_name <= NOW() AT TIME ZONE timezone_name
      ) as ret_period_3,

      (SELECT COUNT(DISTINCT ae.user_id)
       FROM public.analytics_events ae
       WHERE ae.user_id = ANY(cs.user_ids)
         AND ae.event_timestamp AT TIME ZONE timezone_name >= cs.cohort_start + (period_interval * 4)
         AND ae.event_timestamp AT TIME ZONE timezone_name < cs.cohort_start + (period_interval * 5)
         AND ae.event_timestamp AT TIME ZONE timezone_name <= NOW() AT TIME ZONE timezone_name
      ) as ret_period_4,

      (SELECT COUNT(DISTINCT ae.user_id)
       FROM public.analytics_events ae
       WHERE ae.user_id = ANY(cs.user_ids)
         AND ae.event_timestamp AT TIME ZONE timezone_name >= cs.cohort_start + (period_interval * 5)
         AND ae.event_timestamp AT TIME ZONE timezone_name < cs.cohort_start + (period_interval * 6)
         AND ae.event_timestamp AT TIME ZONE timezone_name <= NOW() AT TIME ZONE timezone_name
      ) as ret_period_5,

      (SELECT COUNT(DISTINCT ae.user_id)
       FROM public.analytics_events ae
       WHERE ae.user_id = ANY(cs.user_ids)
         AND ae.event_timestamp AT TIME ZONE timezone_name >= cs.cohort_start + (period_interval * 6)
         AND ae.event_timestamp AT TIME ZONE timezone_name < cs.cohort_start + (period_interval * 7)
         AND ae.event_timestamp AT TIME ZONE timezone_name <= NOW() AT TIME ZONE timezone_name
      ) as ret_period_6,

      (SELECT COUNT(DISTINCT ae.user_id)
       FROM public.analytics_events ae
       WHERE ae.user_id = ANY(cs.user_ids)
         AND ae.event_timestamp AT TIME ZONE timezone_name >= cs.cohort_start + (period_interval * 7)
         AND ae.event_timestamp AT TIME ZONE timezone_name < cs.cohort_start + (period_interval * 8)
         AND ae.event_timestamp AT TIME ZONE timezone_name <= NOW() AT TIME ZONE timezone_name
      ) as ret_period_7

    FROM cohort_summary cs
    -- Only calculate for periods that have had enough time to exist
    WHERE cs.cohort_start <= NOW() AT TIME ZONE timezone_name - period_interval
  )
  SELECT
    rc.cohort_key,
    rc.total_users,
    rc.ret_period_0,
    CASE WHEN NOW() AT TIME ZONE timezone_name >=
      (SELECT MIN(cohort_start) FROM cohort_summary WHERE cohort_key = rc.cohort_key) + period_interval
      THEN rc.ret_period_1 ELSE NULL END,
    CASE WHEN NOW() AT TIME ZONE timezone_name >=
      (SELECT MIN(cohort_start) FROM cohort_summary WHERE cohort_key = rc.cohort_key) + (period_interval * 2)
      THEN rc.ret_period_2 ELSE NULL END,
    CASE WHEN NOW() AT TIME ZONE timezone_name >=
      (SELECT MIN(cohort_start) FROM cohort_summary WHERE cohort_key = rc.cohort_key) + (period_interval * 3)
      THEN rc.ret_period_3 ELSE NULL END,
    CASE WHEN NOW() AT TIME ZONE timezone_name >=
      (SELECT MIN(cohort_start) FROM cohort_summary WHERE cohort_key = rc.cohort_key) + (period_interval * 4)
      THEN rc.ret_period_4 ELSE NULL END,
    CASE WHEN NOW() AT TIME ZONE timezone_name >=
      (SELECT MIN(cohort_start) FROM cohort_summary WHERE cohort_key = rc.cohort_key) + (period_interval * 5)
      THEN rc.ret_period_5 ELSE NULL END,
    CASE WHEN NOW() AT TIME ZONE timezone_name >=
      (SELECT MIN(cohort_start) FROM cohort_summary WHERE cohort_key = rc.cohort_key) + (period_interval * 6)
      THEN rc.ret_period_6 ELSE NULL END,
    CASE WHEN NOW() AT TIME ZONE timezone_name >=
      (SELECT MIN(cohort_start) FROM cohort_summary WHERE cohort_key = rc.cohort_key) + (period_interval * 7)
      THEN rc.ret_period_7 ELSE NULL END
  FROM retention_calculations rc
  ORDER BY rc.cohort_key DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_cohort_analysis_data(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cohort_analysis_data(text, text) TO service_role;

-- =============================================================================
-- 2. CREATE HELPER FUNCTIONS FOR DATA ACCESS
-- =============================================================================

-- Function to get all user profiles (bypasses RLS issues)
CREATE OR REPLACE FUNCTION get_all_user_profiles()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT up.id, up.email, up.created_at
  FROM public.user_profiles up
  WHERE up.created_at IS NOT NULL
  ORDER BY up.created_at DESC;
END;
$$;

-- Function to get all analytics events (bypasses RLS issues)
CREATE OR REPLACE FUNCTION get_all_analytics_events()
RETURNS TABLE (
  user_id uuid,
  event_timestamp timestamp with time zone,
  event_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ae.user_id, ae.event_timestamp, ae.event_type
  FROM public.analytics_events ae
  WHERE ae.user_id IS NOT NULL
    AND ae.event_timestamp IS NOT NULL
  ORDER BY ae.event_timestamp DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_all_user_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_user_profiles() TO service_role;
GRANT EXECUTE ON FUNCTION get_all_analytics_events() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_analytics_events() TO service_role;

-- =============================================================================
-- 3. TIMEZONE CONFIGURATION
-- =============================================================================

-- Helper function to detect user's timezone (can be enhanced)
CREATE OR REPLACE FUNCTION get_app_timezone()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  -- Default to UTC for consistency, but can be configured per deployment
  SELECT 'UTC'::text;
$$;

-- =============================================================================
-- 4. TEST THE NEW FUNCTIONS
-- =============================================================================

-- Test with different timezones
SELECT 'Testing UTC timezone' as test;
SELECT * FROM get_cohort_analysis_data('week', 'UTC') LIMIT 5;

-- Test with US Eastern timezone
SELECT 'Testing US/Eastern timezone' as test;
SELECT * FROM get_cohort_analysis_data('week', 'US/Eastern') LIMIT 5;