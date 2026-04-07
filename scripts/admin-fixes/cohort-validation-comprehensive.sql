-- COMPREHENSIVE COHORT ANALYSIS VALIDATION
-- Run this in Supabase SQL Editor to validate cohort methodology

-- =============================================================================
-- 1. DATA AVAILABILITY & OVERLAP CHECK
-- =============================================================================

SELECT '=== DATA AVAILABILITY CHECK ===' as section;

-- Check basic table existence and data
SELECT
  'user_profiles' as table_name,
  COUNT(*) as total_records,
  MIN(created_at) as earliest_date,
  MAX(created_at) as latest_date,
  COUNT(CASE WHEN created_at IS NULL THEN 1 END) as null_dates
FROM public.user_profiles

UNION ALL

SELECT
  'analytics_events' as table_name,
  COUNT(*) as total_records,
  MIN(event_timestamp) as earliest_date,
  MAX(event_timestamp) as latest_date,
  COUNT(CASE WHEN event_timestamp IS NULL THEN 1 END) as null_dates
FROM public.analytics_events;

-- Check date range overlap (CRITICAL)
SELECT '=== DATE RANGE OVERLAP ANALYSIS ===' as section;

WITH date_analysis AS (
  SELECT
    (SELECT MIN(created_at) FROM public.user_profiles) as user_min,
    (SELECT MAX(created_at) FROM public.user_profiles) as user_max,
    (SELECT MIN(event_timestamp) FROM public.analytics_events) as event_min,
    (SELECT MAX(event_timestamp) FROM public.analytics_events) as event_max
)
SELECT
  user_min,
  user_max,
  event_min,
  event_max,
  CASE
    WHEN user_min > event_max THEN '🚨 CRITICAL: All users created after last event'
    WHEN user_max < event_min THEN '🚨 CRITICAL: All events after last user'
    WHEN user_min > event_min AND user_max < event_max THEN '✅ GOOD: User dates within event range'
    WHEN event_min > user_min AND event_max < user_max THEN '⚠️ WARNING: Event dates within user range'
    ELSE '✅ GOOD: Ranges overlap properly'
  END as overlap_status,
  EXTRACT(days FROM LEAST(user_max, event_max) - GREATEST(user_min, event_min)) as overlap_days
FROM date_analysis;

-- =============================================================================
-- 2. USER-EVENT LINKAGE VALIDATION
-- =============================================================================

SELECT '=== USER-EVENT LINKAGE CHECK ===' as section;

SELECT
  COUNT(DISTINCT up.id) as total_users,
  COUNT(DISTINCT ae.user_id) as users_with_events,
  COUNT(DISTINCT up.id) - COUNT(DISTINCT ae.user_id) as users_without_events,
  ROUND((COUNT(DISTINCT ae.user_id)::numeric / NULLIF(COUNT(DISTINCT up.id), 0)) * 100, 2) as percent_with_activity,
  COUNT(DISTINCT ae.user_id) as active_users,
  COUNT(*) as total_events
FROM public.user_profiles up
LEFT JOIN public.analytics_events ae ON up.id = ae.user_id;

-- =============================================================================
-- 3. TIMEZONE CONSISTENCY CHECK
-- =============================================================================

SELECT '=== TIMEZONE ANALYSIS ===' as section;

-- Check if timestamps have timezone info
SELECT
  'user_profiles.created_at' as field,
  MIN(created_at) as sample_min,
  MAX(created_at) as sample_max,
  EXTRACT(timezone FROM MIN(created_at)) as timezone_offset_min,
  EXTRACT(timezone FROM MAX(created_at)) as timezone_offset_max
FROM public.user_profiles
WHERE created_at IS NOT NULL

UNION ALL

SELECT
  'analytics_events.event_timestamp' as field,
  MIN(event_timestamp) as sample_min,
  MAX(event_timestamp) as sample_max,
  EXTRACT(timezone FROM MIN(event_timestamp)) as timezone_offset_min,
  EXTRACT(timezone FROM MAX(event_timestamp)) as timezone_offset_max
FROM public.analytics_events
WHERE event_timestamp IS NOT NULL;

-- =============================================================================
-- 4. COHORT PERIOD CONSISTENCY VALIDATION
-- =============================================================================

SELECT '=== COHORT PERIOD CALCULATION TEST ===' as section;

-- Test weekly cohort grouping consistency
WITH sample_dates AS (
  SELECT created_at, id
  FROM public.user_profiles
  WHERE created_at IS NOT NULL
  ORDER BY created_at
  LIMIT 10
),
cohort_calculations AS (
  SELECT
    id,
    created_at,
    created_at AT TIME ZONE 'UTC' as created_at_utc,
    DATE_TRUNC('week', created_at) as cohort_week_raw,
    DATE_TRUNC('week', created_at AT TIME ZONE 'UTC') as cohort_week_utc,
    -- Monday-based week (ISO standard)
    DATE_TRUNC('week', created_at) as cohort_week_monday,
    -- Sunday-based week (US standard)
    DATE_TRUNC('week', created_at - INTERVAL '1 day') + INTERVAL '1 day' as cohort_week_sunday
  FROM sample_dates
)
SELECT
  'Weekly Cohort Grouping Test' as test_name,
  created_at,
  cohort_week_raw,
  cohort_week_utc,
  CASE
    WHEN cohort_week_raw = cohort_week_utc THEN '✅ Consistent'
    ELSE '⚠️ Timezone affects grouping'
  END as timezone_consistency
FROM cohort_calculations
ORDER BY created_at;

-- =============================================================================
-- 5. RETENTION CALCULATION ACCURACY TEST
-- =============================================================================

SELECT '=== RETENTION CALCULATION TEST ===' as section;

-- Pick one cohort and manually validate retention
WITH test_cohort AS (
  -- Get the most recent cohort with at least 5 users
  SELECT
    DATE_TRUNC('week', created_at) as cohort_week,
    COUNT(*) as cohort_size
  FROM public.user_profiles
  WHERE created_at >= NOW() - INTERVAL '8 weeks'
  GROUP BY DATE_TRUNC('week', created_at)
  HAVING COUNT(*) >= 3
  ORDER BY cohort_week DESC
  LIMIT 1
),
cohort_users AS (
  SELECT up.id, up.created_at, tc.cohort_week
  FROM public.user_profiles up
  JOIN test_cohort tc ON DATE_TRUNC('week', up.created_at) = tc.cohort_week
),
retention_analysis AS (
  SELECT
    cu.id,
    cu.created_at,
    cu.cohort_week,
    -- Week 0 (signup week)
    CASE WHEN EXISTS(
      SELECT 1 FROM public.analytics_events ae
      WHERE ae.user_id = cu.id
      AND ae.event_timestamp >= cu.cohort_week
      AND ae.event_timestamp < cu.cohort_week + INTERVAL '1 week'
    ) THEN 1 ELSE 0 END as active_week_0,
    -- Week 1
    CASE WHEN EXISTS(
      SELECT 1 FROM public.analytics_events ae
      WHERE ae.user_id = cu.id
      AND ae.event_timestamp >= cu.cohort_week + INTERVAL '1 week'
      AND ae.event_timestamp < cu.cohort_week + INTERVAL '2 weeks'
    ) THEN 1 ELSE 0 END as active_week_1,
    -- Week 2
    CASE WHEN EXISTS(
      SELECT 1 FROM public.analytics_events ae
      WHERE ae.user_id = cu.id
      AND ae.event_timestamp >= cu.cohort_week + INTERVAL '2 weeks'
      AND ae.event_timestamp < cu.cohort_week + INTERVAL '3 weeks'
    ) THEN 1 ELSE 0 END as active_week_2
  FROM cohort_users cu
)
SELECT
  'Test Cohort: ' || cohort_week::date as cohort_period,
  COUNT(*) as total_users,
  SUM(active_week_0) as week_0_retained,
  SUM(active_week_1) as week_1_retained,
  SUM(active_week_2) as week_2_retained,
  ROUND((SUM(active_week_0)::numeric / COUNT(*)) * 100, 1) as week_0_percent,
  ROUND((SUM(active_week_1)::numeric / COUNT(*)) * 100, 1) as week_1_percent,
  ROUND((SUM(active_week_2)::numeric / COUNT(*)) * 100, 1) as week_2_percent
FROM retention_analysis
GROUP BY cohort_week;

-- =============================================================================
-- 6. IDENTIFY COMMON ISSUES
-- =============================================================================

SELECT '=== ISSUE DETECTION ===' as section;

-- Issue 1: Users with no events ever
SELECT
  'Users with no analytics events' as issue,
  COUNT(*) as count
FROM public.user_profiles up
LEFT JOIN public.analytics_events ae ON up.id = ae.user_id
WHERE ae.user_id IS NULL;

-- Issue 2: Events with invalid user_ids
SELECT
  'Events with invalid user_ids' as issue,
  COUNT(*) as count
FROM public.analytics_events ae
LEFT JOIN public.user_profiles up ON ae.user_id = up.id
WHERE ae.user_id IS NOT NULL AND up.id IS NULL;

-- Issue 3: Events before user signup (impossible)
SELECT
  'Events before user signup' as issue,
  COUNT(*) as count
FROM public.analytics_events ae
JOIN public.user_profiles up ON ae.user_id = up.id
WHERE ae.event_timestamp < up.created_at;

-- =============================================================================
-- 7. RECOMMENDATIONS
-- =============================================================================

SELECT '=== RECOMMENDATIONS ===' as section;

SELECT
  'Timezone Handling' as recommendation,
  'Use AT TIME ZONE ''UTC'' for all date calculations to ensure consistency' as action

UNION ALL

SELECT
  'Week Start Day' as recommendation,
  'Standardize on Monday (ISO) or Sunday (US) for week calculations' as action

UNION ALL

SELECT
  'Data Quality' as recommendation,
  'Filter out events before user signup and users without any events' as action

UNION ALL

SELECT
  'Cohort Definition' as recommendation,
  'Use DATE_TRUNC(''week'', created_at AT TIME ZONE ''UTC'') for consistent grouping' as action;