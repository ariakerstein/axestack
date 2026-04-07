-- COHORT ANALYSIS FIX FOR DATA GAP
-- Only analyze cohorts where analytics tracking was active

-- =============================================================================
-- SOLUTION: Filter cohorts to analytics-tracked period only
-- =============================================================================

-- Updated cohort function that handles the data gap properly
CREATE OR REPLACE FUNCTION get_valid_cohort_analysis_data(
  period_type text DEFAULT 'week'
)
RETURNS TABLE (
  cohort_period text,
  cohort_size integer,
  period_0 integer,
  period_1 integer,
  period_2 integer,
  period_3 integer,
  period_4 integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  analytics_start_date timestamp with time zone;
BEGIN
  -- Get the earliest analytics event date
  SELECT MIN(event_timestamp) INTO analytics_start_date
  FROM public.analytics_events;

  -- If no analytics data, return empty
  IF analytics_start_date IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH valid_user_cohorts AS (
    -- Only include users who signed up after analytics tracking began
    -- OR who have at least one analytics event (proving they were tracked)
    SELECT
      up.id as user_id,
      up.created_at,
      CASE
        WHEN period_type = 'day' THEN
          DATE_TRUNC('day', up.created_at AT TIME ZONE 'UTC')::date::text
        WHEN period_type = 'week' THEN
          DATE_TRUNC('week', up.created_at AT TIME ZONE 'UTC')::date::text
        WHEN period_type = 'month' THEN
          TO_CHAR(DATE_TRUNC('month', up.created_at AT TIME ZONE 'UTC'), 'YYYY-MM')
        ELSE
          DATE_TRUNC('week', up.created_at AT TIME ZONE 'UTC')::date::text
      END as cohort_key,
      DATE_TRUNC(period_type, up.created_at AT TIME ZONE 'UTC') as cohort_start
    FROM public.user_profiles up
    WHERE up.created_at IS NOT NULL
      -- CRITICAL FIX: Only include users who could have been tracked
      AND (
        up.created_at >= analytics_start_date  -- Signed up after tracking began
        OR EXISTS (                             -- OR have analytics events (were tracked)
          SELECT 1 FROM public.analytics_events ae
          WHERE ae.user_id = up.id
        )
      )
      -- Reasonable time window
      AND up.created_at >= NOW() - INTERVAL '6 months'
  ),
  cohort_summary AS (
    SELECT
      cohort_key,
      cohort_start,
      COUNT(*) as total_users,
      ARRAY_AGG(user_id) as user_ids
    FROM valid_user_cohorts
    GROUP BY cohort_key, cohort_start
  ),
  period_intervals AS (
    SELECT
      CASE
        WHEN period_type = 'day' THEN '1 day'::interval
        WHEN period_type = 'week' THEN '1 week'::interval
        WHEN period_type = 'month' THEN '1 month'::interval
        ELSE '1 week'::interval
      END as interval_length
  ),
  retention_calculations AS (
    SELECT
      cs.cohort_key,
      cs.total_users,
      -- Period 0: Always count all cohort users (100%)
      cs.total_users as ret_period_0,

      -- Period 1: Users active in next period
      (SELECT COUNT(DISTINCT ae.user_id)
       FROM public.analytics_events ae, period_intervals pi
       WHERE ae.user_id = ANY(cs.user_ids)
         AND ae.event_timestamp >= cs.cohort_start + pi.interval_length
         AND ae.event_timestamp < cs.cohort_start + (pi.interval_length * 2)
      ) as ret_period_1,

      -- Period 2: Users active in second period after signup
      (SELECT COUNT(DISTINCT ae.user_id)
       FROM public.analytics_events ae, period_intervals pi
       WHERE ae.user_id = ANY(cs.user_ids)
         AND ae.event_timestamp >= cs.cohort_start + (pi.interval_length * 2)
         AND ae.event_timestamp < cs.cohort_start + (pi.interval_length * 3)
      ) as ret_period_2,

      -- Period 3
      (SELECT COUNT(DISTINCT ae.user_id)
       FROM public.analytics_events ae, period_intervals pi
       WHERE ae.user_id = ANY(cs.user_ids)
         AND ae.event_timestamp >= cs.cohort_start + (pi.interval_length * 3)
         AND ae.event_timestamp < cs.cohort_start + (pi.interval_length * 4)
      ) as ret_period_3,

      -- Period 4
      (SELECT COUNT(DISTINCT ae.user_id)
       FROM public.analytics_events ae, period_intervals pi
       WHERE ae.user_id = ANY(cs.user_ids)
         AND ae.event_timestamp >= cs.cohort_start + (pi.interval_length * 4)
         AND ae.event_timestamp < cs.cohort_start + (pi.interval_length * 5)
      ) as ret_period_4

    FROM cohort_summary cs, period_intervals pi
    -- Only include cohorts that have had time for at least period 1
    WHERE cs.cohort_start <= NOW() AT TIME ZONE 'UTC' - pi.interval_length
  )
  SELECT
    rc.cohort_key,
    rc.total_users,
    rc.ret_period_0,
    -- Only show periods that have had enough time to occur
    CASE WHEN NOW() AT TIME ZONE 'UTC' >=
      (SELECT MIN(cohort_start) FROM cohort_summary WHERE cohort_key = rc.cohort_key) +
      (SELECT interval_length FROM period_intervals)
      THEN rc.ret_period_1 ELSE NULL END,
    CASE WHEN NOW() AT TIME ZONE 'UTC' >=
      (SELECT MIN(cohort_start) FROM cohort_summary WHERE cohort_key = rc.cohort_key) +
      (SELECT interval_length * 2 FROM period_intervals)
      THEN rc.ret_period_2 ELSE NULL END,
    CASE WHEN NOW() AT TIME ZONE 'UTC' >=
      (SELECT MIN(cohort_start) FROM cohort_summary WHERE cohort_key = rc.cohort_key) +
      (SELECT interval_length * 3 FROM period_intervals)
      THEN rc.ret_period_3 ELSE NULL END,
    CASE WHEN NOW() AT TIME ZONE 'UTC' >=
      (SELECT MIN(cohort_start) FROM cohort_summary WHERE cohort_key = rc.cohort_key) +
      (SELECT interval_length * 4 FROM period_intervals)
      THEN rc.ret_period_4 ELSE NULL END
  FROM retention_calculations rc
  ORDER BY rc.cohort_key DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_valid_cohort_analysis_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_valid_cohort_analysis_data(text) TO service_role;

-- =============================================================================
-- TEST THE CORRECTED FUNCTION
-- =============================================================================

-- Show analytics tracking period
SELECT
  'Analytics Tracking Period' as info,
  MIN(event_timestamp) as tracking_started,
  MAX(event_timestamp) as tracking_latest,
  COUNT(DISTINCT user_id) as tracked_users
FROM public.analytics_events;

-- Show corrected cohort data (should only include July+ cohorts)
SELECT 'Valid Cohorts (Analytics Period Only)' as info;
SELECT * FROM get_valid_cohort_analysis_data('week') LIMIT 8;