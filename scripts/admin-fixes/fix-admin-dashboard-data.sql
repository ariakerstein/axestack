-- COMPREHENSIVE ADMIN DASHBOARD DATA FIX
-- Run this in your Supabase SQL Editor to fix all data issues

-- 1. First, let's see what data actually exists
SELECT '=== CURRENT DATA AUDIT ===' as section;

-- Check user counts
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as total_records,
  COUNT(email) as with_email,
  COUNT(*) - COUNT(email) as without_email,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM public.user_profiles;

-- Check auth.users count
SELECT 
  'auth.users' as table_name,
  COUNT(*) as total_records,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM auth.users;

-- Check analytics events
SELECT 
  'analytics_events' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  MIN(event_timestamp) as earliest_event,
  MAX(event_timestamp) as latest_event
FROM public.analytics_events;

-- Check conversation messages
SELECT 
  'conversation_messages' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as earliest_message,
  MAX(created_at) as latest_message
FROM public.conversation_messages;

-- 2. Fix the admin analytics view with correct logic
CREATE OR REPLACE VIEW admin_analytics_summary AS
SELECT 
  -- Registration metrics (from user_profiles)
  (SELECT COUNT(*) FROM public.user_profiles) as total_registrations,
  (SELECT COUNT(*) FROM public.user_profiles WHERE email IS NOT NULL) as completed_registrations,
  
  -- Activity metrics (from analytics_events) - Fixed to use proper time ranges
  (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events 
   WHERE user_id IS NOT NULL 
   AND event_timestamp >= NOW() - INTERVAL '24 hours') as daily_active_users,
   
  (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events 
   WHERE user_id IS NOT NULL 
   AND event_timestamp >= NOW() - INTERVAL '7 days') as weekly_active_users,
   
  (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events 
   WHERE user_id IS NOT NULL 
   AND event_timestamp >= NOW() - INTERVAL '30 days') as monthly_active_users,
   
  -- Questions (from conversation_messages)
  (SELECT COUNT(*) FROM public.conversation_messages) as total_questions,
  
  -- Visitor metrics (from analytics_events) - Fixed type handling
  (SELECT COUNT(DISTINCT identifier) FROM (
    SELECT 
      CASE 
        WHEN user_id IS NOT NULL THEN user_id::text
        ELSE session_id
      END as identifier
    FROM public.analytics_events 
    WHERE event_timestamp >= NOW() - INTERVAL '30 days'
  ) visitor_data) as unique_visitors_30d,
  
  -- Growth metrics (comparing current vs previous periods)
  (SELECT COUNT(*) FROM public.user_profiles 
   WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
   
  (SELECT COUNT(*) FROM public.user_profiles 
   WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
   
  -- Engagement rate (users with activity vs total users)
  (SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(DISTINCT user_id)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
      ELSE 0 
    END
   FROM public.user_profiles up
   LEFT JOIN public.analytics_events ae ON up.id = ae.user_id
   WHERE ae.user_id IS NOT NULL
   AND ae.event_timestamp >= NOW() - INTERVAL '30 days'
  ) as engagement_rate_30d
;

-- 3. Create a function to get accurate user counts by time period
CREATE OR REPLACE FUNCTION get_user_counts_by_period(
  period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  period_name TEXT,
  total_users BIGINT,
  new_users BIGINT,
  active_users BIGINT,
  engagement_rate DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  
  SELECT 
    'Last ' || period_days || ' days'::TEXT as period_name,
    (SELECT COUNT(*) FROM public.user_profiles) as total_users,
    (SELECT COUNT(*) FROM public.user_profiles 
     WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL) as new_users,
    (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events 
     WHERE user_id IS NOT NULL 
     AND event_timestamp >= NOW() - (period_days || ' days')::INTERVAL) as active_users,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.user_profiles) > 0 THEN
        ROUND(
          ((SELECT COUNT(DISTINCT user_id) FROM public.analytics_events 
            WHERE user_id IS NOT NULL 
            AND event_timestamp >= NOW() - (period_days || ' days')::INTERVAL)::DECIMAL / 
           (SELECT COUNT(*) FROM public.user_profiles)::DECIMAL) * 100, 2
        )
      ELSE 0 
    END as engagement_rate;
END;
$$;

-- 4. Create a function to get cohort data with correct date logic
CREATE OR REPLACE FUNCTION get_cohort_retention_data(
  start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '6 months'),
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  cohort_month TEXT,
  total_users BIGINT,
  week_0 BIGINT,
  week_1 BIGINT,
  week_2 BIGINT,
  week_3 BIGINT,
  week_4 BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  
  WITH user_cohorts AS (
    SELECT 
      DATE_TRUNC('month', created_at) as cohort_month,
      id as user_id,
      created_at
    FROM public.user_profiles
    WHERE created_at >= start_date AND created_at <= end_date
  ),
  user_activity AS (
    SELECT 
      uc.cohort_month,
      uc.user_id,
      uc.created_at,
      ae.event_timestamp,
      -- FIXED: Calculate weeks since signup using date arithmetic instead of EXTRACT(WEEK FROM interval)
      FLOOR(EXTRACT(EPOCH FROM (ae.event_timestamp - uc.created_at)) / (7 * 24 * 60 * 60)) as weeks_since_signup
    FROM user_cohorts uc
    LEFT JOIN public.analytics_events ae ON uc.user_id = ae.user_id
    WHERE ae.user_id IS NOT NULL
  )
  SELECT 
    TO_CHAR(uc.cohort_month, 'YYYY-MM') as cohort_month,
    COUNT(DISTINCT uc.user_id) as total_users,
    COUNT(DISTINCT CASE WHEN ua.weeks_since_signup = 0 THEN ua.user_id END) as week_0,
    COUNT(DISTINCT CASE WHEN ua.weeks_since_signup = 1 THEN ua.user_id END) as week_1,
    COUNT(DISTINCT CASE WHEN ua.weeks_since_signup = 2 THEN ua.user_id END) as week_2,
    COUNT(DISTINCT CASE WHEN ua.weeks_since_signup = 3 THEN ua.user_id END) as week_3,
    COUNT(DISTINCT CASE WHEN ua.weeks_since_signup = 4 THEN ua.user_id END) as week_4
  FROM user_cohorts uc
  LEFT JOIN user_activity ua ON uc.user_id = ua.user_id
  GROUP BY uc.cohort_month
  ORDER BY uc.cohort_month DESC;
END;
$$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION get_user_counts_by_period(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_counts_by_period(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cohort_retention_data(DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION get_cohort_retention_data(DATE, DATE) TO authenticated;

-- 6. Test the new functions
SELECT '=== TESTING NEW FUNCTIONS ===' as section;

-- Test user counts by period
SELECT * FROM get_user_counts_by_period(30);
SELECT * FROM get_user_counts_by_period(7);

-- Test cohort data (last 6 months)
SELECT * FROM get_cohort_retention_data();

-- Test the updated view
SELECT * FROM admin_analytics_summary;

-- 7. Show what the dashboard should now display
SELECT '=== EXPECTED DASHBOARD VALUES ===' as section;

SELECT 
  'Total Auth Users' as metric,
  (SELECT COUNT(*) FROM public.user_profiles) as value,
  'Should match your Supabase user count' as note
UNION ALL
SELECT 
  'New Registrations (7d)' as metric,
  (SELECT COUNT(*) FROM public.user_profiles WHERE created_at >= NOW() - INTERVAL '7 days') as value,
  'Users created in last 7 days' as note
UNION ALL
SELECT 
  'Monthly Active Users' as metric,
  (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events 
   WHERE user_id IS NOT NULL AND event_timestamp >= NOW() - INTERVAL '30 days') as value,
  'Users with activity in last 30 days' as note
UNION ALL
SELECT 
  'Total Questions' as metric,
  (SELECT COUNT(*) FROM public.conversation_messages) as value,
  'All conversation messages' as note;
