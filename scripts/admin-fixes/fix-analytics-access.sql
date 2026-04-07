-- Fix Analytics Access Issues
-- This script fixes access to analytics data after security changes

-- 1. Grant proper access to analytics_events table
DO $$
BEGIN
  -- Check if analytics_events table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'analytics_events'
  ) THEN
    -- Drop existing policies to recreate them properly
    DROP POLICY IF EXISTS "Allow analytics event insertion for all users" ON public.analytics_events;
    DROP POLICY IF EXISTS "Allow reading analytics events" ON public.analytics_events;
    DROP POLICY IF EXISTS "Allow updating analytics events" ON public.analytics_events;
    DROP POLICY IF EXISTS "Allow deleting analytics events" ON public.analytics_events;
    DROP POLICY IF EXISTS "Allow cohort analysis view access" ON public.analytics_events;
    
    -- Create comprehensive INSERT policy
    CREATE POLICY "Allow analytics event insertion for all users"
    ON public.analytics_events
    FOR INSERT
    WITH CHECK (
      -- Allow if user_id is null (anonymous users)
      user_id IS NULL 
      OR 
      -- Allow if user_id matches the authenticated user
      (auth.uid() IS NOT NULL AND user_id = auth.uid())
    );
    
    -- Create comprehensive SELECT policy
    CREATE POLICY "Allow reading analytics events"
    ON public.analytics_events
    FOR SELECT
    USING (
      -- Service role can read everything
      auth.jwt() ->> 'role' = 'service_role'
      OR
      -- Admin users can read all analytics data
      EXISTS (
        SELECT 1 FROM public.admin_roles 
        WHERE user_id = auth.uid() 
        AND role_type IN ('admin', 'super_admin') 
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
      )
      OR
      -- Authenticated users can read their own events
      (auth.uid() IS NOT NULL AND user_id = auth.uid())
      OR
      -- Allow reading anonymous events for analytics purposes
      user_id IS NULL
    );
    
    -- Create UPDATE policy for analytics_events (for admin cleanup)
    CREATE POLICY "Allow updating analytics events"
    ON public.analytics_events
    FOR UPDATE
    USING (
      -- Service role can update everything
      auth.jwt() ->> 'role' = 'service_role'
      OR
      -- Admin users can update analytics data
      EXISTS (
        SELECT 1 FROM public.admin_roles 
        WHERE user_id = auth.uid() 
        AND role_type IN ('admin', 'super_admin') 
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
      )
    );
    
    -- Create DELETE policy for analytics_events (for admin cleanup)
    CREATE POLICY "Allow deleting analytics events"
    ON public.analytics_events
    FOR DELETE
    USING (
      -- Service role can delete everything
      auth.jwt() ->> 'role' = 'service_role'
      OR
      -- Admin users can delete analytics data
      EXISTS (
        SELECT 1 FROM public.admin_roles 
        WHERE user_id = auth.uid() 
        AND role_type IN ('admin', 'super_admin') 
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
      )
    );

    RAISE NOTICE 'Analytics events policies recreated successfully';
  ELSE
    RAISE NOTICE 'Analytics events table does not exist';
  END IF;
END $$;

-- 2. Fix user_profiles access
DO $$
BEGIN
  -- Check if user_profiles table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) THEN
    -- Ensure admin users can view all profiles
    DROP POLICY IF EXISTS "user_profiles_admin_select_all" ON public.user_profiles;
    
    CREATE POLICY "user_profiles_admin_select_all" 
    ON public.user_profiles 
    FOR SELECT 
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.admin_roles 
        WHERE user_id = auth.uid() 
        AND role_type IN ('admin', 'super_admin') 
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
      )
    );
    
    RAISE NOTICE 'User profiles admin access policy recreated successfully';
  ELSE
    RAISE NOTICE 'User profiles table does not exist';
  END IF;
END $$;

-- 3. Recreate the cohort_analysis_data view if it doesn't exist
DO $$
BEGIN
  -- Check if the view exists
  IF NOT EXISTS (
    SELECT FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relname = 'cohort_analysis_data'
  ) THEN
    -- Create the materialized view
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
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_cohort_analysis_data_cohort_date
    ON public.cohort_analysis_data(cohort_date);
    
    CREATE INDEX IF NOT EXISTS idx_cohort_analysis_data_cohort_type
    ON public.cohort_analysis_data(cohort_type);
    
    RAISE NOTICE 'Cohort analysis view created successfully';
  ELSE
    RAISE NOTICE 'Cohort analysis view already exists';
  END IF;
END $$;

-- 4. Create or update the refresh function
DO $$
BEGIN
  -- Create or replace the refresh function
  CREATE OR REPLACE FUNCTION refresh_cohort_analysis_data()
  RETURNS void AS $$
  BEGIN
    REFRESH MATERIALIZED VIEW public.cohort_analysis_data;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  -- Grant permissions
  GRANT EXECUTE ON FUNCTION refresh_cohort_analysis_data() TO authenticated;
  GRANT EXECUTE ON FUNCTION refresh_cohort_analysis_data() TO service_role;
  
  -- Grant permissions to the view
  GRANT SELECT ON public.cohort_analysis_data TO authenticated;
  GRANT SELECT ON public.cohort_analysis_data TO service_role;
  
  RAISE NOTICE 'Refresh function created and permissions granted';
END $$;

-- 5. Refresh the view to populate it with data
SELECT refresh_cohort_analysis_data();
