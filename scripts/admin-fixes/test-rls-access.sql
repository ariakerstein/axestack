-- SIMPLE RLS ACCESS TEST
-- Run this after the RLS fix to verify access is working

-- 1. Test basic table access
SELECT '=== BASIC TABLE ACCESS TEST ===' as section;

-- This should show your actual user count (not just 1)
SELECT 
  'user_profiles' as table,
  COUNT(*) as total_users,
  'Expected: Your actual Supabase user count' as note
FROM public.user_profiles;

-- This should show your actual analytics events
SELECT 
  'analytics_events' as table,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users,
  'Expected: Your actual analytics data' as note
FROM public.analytics_events;

-- This should show your actual conversation messages
SELECT 
  'conversation_messages' as table,
  COUNT(*) as total_messages,
  COUNT(DISTINCT user_id) as unique_users,
  'Expected: Your actual conversation data' as note
FROM public.conversation_messages;

-- 2. Test date-based queries (the ones that were failing with 500 errors)
SELECT '=== DATE QUERY TEST ===' as section;

-- Test ordering by timestamp (this was failing with 500 error)
SELECT 
  'analytics_events timestamp order' as test,
  COUNT(*) as event_count,
  MIN(event_timestamp) as earliest,
  MAX(event_timestamp) as latest
FROM public.analytics_events;

-- Test filtering for non-null user IDs (this was failing with 500 error)
SELECT 
  'analytics_events non-null user_id' as test,
  COUNT(*) as events_with_user,
  COUNT(DISTINCT user_id) as unique_users
FROM public.analytics_events
WHERE user_id IS NOT NULL;

-- Test filtering by event type (this was failing with 500 error)
SELECT 
  'analytics_events page_view filter' as test,
  COUNT(*) as page_views,
  COUNT(DISTINCT user_id) as unique_users
FROM public.analytics_events
WHERE event_type = 'page_view';

-- 3. Test cohort analysis queries
SELECT '=== COHORT ANALYSIS TEST ===' as section;

-- Test user signups for cohort analysis
WITH user_signups AS (
  SELECT id, created_at 
  FROM public.user_profiles 
  WHERE created_at >= NOW() - INTERVAL '6 months'
)
SELECT 
  'user_signups_cohort' as test,
  COUNT(*) as total_signups,
  MIN(created_at) as earliest_signup,
  MAX(created_at) as latest_signup
FROM user_signups;

-- Test if we can join users with their analytics events
WITH user_signups AS (
  SELECT id, created_at 
  FROM public.user_profiles 
  WHERE created_at >= NOW() - INTERVAL '6 months'
  LIMIT 10  -- Limit to avoid overwhelming output
),
user_activities AS (
  SELECT 
    up.id as user_id,
    up.created_at as signup_date,
    COUNT(ae.id) as event_count,
    MIN(ae.event_timestamp) as first_event,
    MAX(ae.event_timestamp) as last_event
  FROM user_signups up
  LEFT JOIN public.analytics_events ae ON up.id = ae.user_id
  GROUP BY up.id, up.created_at
)
SELECT 
  'user_activities_join' as test,
  COUNT(*) as users_with_data,
  ROUND(AVG(event_count), 2) as avg_events_per_user,
  MIN(first_event) as earliest_activity,
  MAX(last_event) as latest_activity
FROM user_activities;

-- 4. Summary of what should now work
SELECT '=== SUMMARY: WHAT SHOULD NOW WORK ===' as section;

SELECT 
  'Dashboard should now show:' as item,
  'Your actual Supabase user count (not 1)' as expected
UNION ALL
SELECT 
  'Cohort analysis should:' as item,
  'Display real user data instead of "No cohort data available"' as expected
UNION ALL
SELECT 
  'Analytics should show:' as item,
  'Real engagement numbers instead of 0s' as expected
UNION ALL
SELECT 
  'HTTP 500 errors should:' as item,
  'Be gone from the console' as expected;
