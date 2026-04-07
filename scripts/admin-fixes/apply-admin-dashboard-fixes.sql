-- Admin Dashboard Data Fixes - Run this in Supabase SQL Editor
-- This script fixes data accuracy issues and adds validation functions

-- 1. Ensure analytics_events has proper event_timestamp indexing
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_timestamp 
ON public.analytics_events(event_timestamp);

-- 2. Create a unified analytics view for admin dashboard
CREATE OR REPLACE VIEW admin_analytics_summary AS
SELECT 
  -- Registration metrics (from user_profiles)
  (SELECT COUNT(*) FROM public.user_profiles) as total_registrations,
  (SELECT COUNT(*) FROM public.user_profiles WHERE email IS NOT NULL) as completed_registrations,
  
  -- Activity metrics (from analytics_events)
  (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events 
   WHERE event_timestamp >= NOW() - INTERVAL '24 hours') as daily_active_users,
  (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events 
   WHERE event_timestamp >= NOW() - INTERVAL '7 days') as weekly_active_users,
  (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events 
   WHERE event_timestamp >= NOW() - INTERVAL '30 days') as monthly_active_users,
   
  -- Questions (from conversation_messages)
  (SELECT COUNT(*) FROM public.conversation_messages) as total_questions,
  
  -- Visitor metrics (from analytics_events) - Fixed type mismatch
  (SELECT COUNT(DISTINCT identifier) FROM (
    SELECT 
      CASE 
        WHEN user_id IS NOT NULL THEN user_id::text
        ELSE session_id
      END as identifier
    FROM public.analytics_events 
    WHERE event_timestamp >= NOW() - INTERVAL '30 days'
  ) visitor_data) as unique_visitors_30d
;

-- 3. Create function to validate data consistency
CREATE OR REPLACE FUNCTION validate_admin_dashboard_data()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  expected_value BIGINT,
  actual_value BIGINT,
  details TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  
  -- Check user_profiles vs auth.users consistency
  SELECT 
    'user_profiles_vs_auth_users'::TEXT as check_name,
    CASE 
      WHEN profiles.count = auth_users.count THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END as status,
    profiles.count as expected_value,
    auth_users.count as actual_value,
    'Profile count should match auth users count'::TEXT as details
  FROM 
    (SELECT COUNT(*) FROM public.user_profiles) profiles(count),
    (SELECT COUNT(*) FROM auth.users) auth_users(count)
  
  UNION ALL
  
  -- Check analytics_events data quality
  SELECT 
    'analytics_events_timestamp_consistency'::TEXT as check_name,
    CASE 
      WHEN inconsistent_count.count = 0 THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END as status,
    0::BIGINT as expected_value,
    inconsistent_count.count as actual_value,
    'All analytics events should have consistent timestamps'::TEXT as details
  FROM 
    (SELECT COUNT(*) FROM public.analytics_events 
     WHERE ABS(EXTRACT(EPOCH FROM (event_timestamp - created_at))) > 60) inconsistent_count(count)
  
  UNION ALL
  
  -- Check conversation_messages user references
  SELECT 
    'conversation_messages_user_references'::TEXT as check_name,
    CASE 
      WHEN orphaned_count.count = 0 THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END as status,
    0::BIGINT as expected_value,
    orphaned_count.count as actual_value,
    'All conversation messages should reference valid users'::TEXT as details
  FROM 
    (SELECT COUNT(*) FROM public.conversation_messages cm
     LEFT JOIN public.user_profiles up ON cm.user_id = up.id
     WHERE up.id IS NULL) orphaned_count(count)
  
  UNION ALL
  
  -- Check for recent activity data
  SELECT 
    'recent_analytics_data'::TEXT as check_name,
    CASE 
      WHEN recent_count.count > 0 THEN 'PASS'::TEXT
      ELSE 'WARNING'::TEXT
    END as status,
    1::BIGINT as expected_value,
    recent_count.count as actual_value,
    'Should have recent analytics data'::TEXT as details
  FROM 
    (SELECT COUNT(*) FROM public.analytics_events 
     WHERE event_timestamp >= NOW() - INTERVAL '7 days') recent_count(count);
END;
$$;

-- 4. Create admin dashboard health check function
CREATE OR REPLACE FUNCTION get_admin_dashboard_health()
RETURNS TABLE (
  metric_name TEXT,
  current_value BIGINT,
  expected_range TEXT,
  status TEXT,
  last_updated TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  
  SELECT 
    'total_registrations'::TEXT as metric_name,
    (SELECT COUNT(*) FROM public.user_profiles) as current_value,
    '> 0'::TEXT as expected_range,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.user_profiles) > 0 THEN 'HEALTHY'::TEXT
      ELSE 'WARNING'::TEXT
    END as status,
    NOW() as last_updated
  
  UNION ALL
  
  SELECT 
    'daily_active_users'::TEXT as metric_name,
    (SELECT COUNT(DISTINCT user_id) FROM public.analytics_events 
     WHERE event_timestamp >= NOW() - INTERVAL '24 hours') as current_value,
    '>= 0'::TEXT as expected_range,
    'HEALTHY'::TEXT as status,
    NOW() as last_updated
  
  UNION ALL
  
  SELECT 
    'total_questions'::TEXT as metric_name,
    (SELECT COUNT(*) FROM public.conversation_messages) as current_value,
    '>= 0'::TEXT as expected_range,
    'HEALTHY'::TEXT as status,
    NOW() as last_updated;
END;
$$;

-- 5. Grant access to the functions
GRANT EXECUTE ON FUNCTION validate_admin_dashboard_data() TO service_role;
GRANT EXECUTE ON FUNCTION validate_admin_dashboard_data() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_health() TO service_role;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_health() TO authenticated;

-- 6. Test the functions
SELECT 'Testing validation function...' as message;
SELECT * FROM validate_admin_dashboard_data();

SELECT 'Testing health function...' as message;
SELECT * FROM get_admin_dashboard_health();

-- 7. Show current data counts for verification
SELECT 'Current Data Counts:' as message;
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as record_count
FROM public.user_profiles
UNION ALL
SELECT 
  'analytics_events' as table_name,
  COUNT(*) as record_count
FROM public.analytics_events
UNION ALL
SELECT 
  'conversation_messages' as table_name,
  COUNT(*) as record_count
FROM public.conversation_messages;

-- 8. Show recent registrations
SELECT 'Recent Registrations (Last 7 days):' as message;
SELECT 
  id,
  email,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/86400 as days_ago
FROM public.user_profiles 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 9. Show recent analytics activity
SELECT 'Recent Analytics Activity (Last 7 days):' as message;
SELECT 
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users
FROM public.analytics_events 
WHERE event_timestamp >= NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY event_count DESC;
