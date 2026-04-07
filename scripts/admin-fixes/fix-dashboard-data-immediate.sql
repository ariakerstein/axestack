-- IMMEDIATE FIX: Fix dashboard data access issues
-- This script addresses the root causes identified

-- 1. Fix the get_analytics_summary function overloading issue
DROP FUNCTION IF EXISTS public.get_analytics_summary();
DROP FUNCTION IF EXISTS public.get_analytics_summary(timestamp with time zone, timestamp with time zone);

-- 2. Create a single, working get_analytics_summary function
CREATE OR REPLACE FUNCTION public.get_analytics_summary(
  start_date timestamp with time zone DEFAULT '2024-01-01'::timestamp with time zone,
  end_date timestamp with time zone DEFAULT NOW()
)
RETURNS TABLE(
  total_users bigint,
  new_users_7d bigint,
  new_users_30d bigint,
  daily_active_users bigint,
  weekly_active_users bigint,
  monthly_active_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d
    FROM user_profiles
  ),
  activity_stats AS (
    SELECT 
      COUNT(DISTINCT user_id) FILTER (WHERE event_timestamp >= NOW() - INTERVAL '1 day' AND user_id IS NOT NULL) as daily_active_users,
      COUNT(DISTINCT user_id) FILTER (WHERE event_timestamp >= NOW() - INTERVAL '7 days' AND user_id IS NOT NULL) as weekly_active_users,
      COUNT(DISTINCT user_id) FILTER (WHERE event_timestamp >= NOW() - INTERVAL '30 days' AND user_id IS NOT NULL) as monthly_active_users
    FROM analytics_events
  )
  SELECT 
    us.total_users,
    us.new_users_7d,
    us.new_users_30d,
    COALESCE(as_stats.daily_active_users, 0),
    COALESCE(as_stats.weekly_active_users, 0),
    COALESCE(as_stats.monthly_active_users, 0)
  FROM user_stats us
  CROSS JOIN activity_stats as_stats;
END;
$$;

-- 3. Fix conversation_messages RLS for admin access
DROP POLICY IF EXISTS "Admin can view all messages" ON conversation_messages;
CREATE POLICY "Admin can view all messages" ON conversation_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE admin_roles.user_id = auth.uid() 
      AND admin_roles.role = 'admin'
    )
  );

-- 4. Create a simple function to get conversation message count
CREATE OR REPLACE FUNCTION public.get_conversation_message_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM conversation_messages);
END;
$$;

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_analytics_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_message_count TO authenticated;

-- 6. Test the functions
DO $$
DECLARE
  result record;
  msg_count bigint;
BEGIN
  -- Test analytics summary
  SELECT * INTO result FROM public.get_analytics_summary();
  RAISE NOTICE 'Analytics Summary: Total Users: %, New 7d: %, New 30d: %, DAU: %, WAU: %, MAU: %', 
    result.total_users, result.new_users_7d, result.new_users_30d, 
    result.daily_active_users, result.weekly_active_users, result.monthly_active_users;
  
  -- Test message count
  SELECT public.get_conversation_message_count() INTO msg_count;
  RAISE NOTICE 'Conversation Messages: %', msg_count;
END;
$$;





