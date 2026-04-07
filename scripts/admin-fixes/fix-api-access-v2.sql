-- EMERGENCY FIX FOR API 500 ERRORS (VERSION 2)
-- This script addresses the 500 errors occurring in the admin dashboard
-- With proper handling of existing policies

-- ===============================
-- PART 1: FIX ADMIN_ROLES RECURSION
-- ===============================

-- 1. Disable RLS temporarily
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies on admin_roles
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'admin_roles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_roles', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- 3. Drop the problematic is_admin function
DROP FUNCTION IF EXISTS public.is_admin();

-- 4. Create a simplified is_admin function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Direct SQL query that bypasses RLS
    RETURN (
        SELECT EXISTS (
            SELECT 1 
            FROM public.admin_roles 
            WHERE user_id = auth.uid() 
            AND role_type IN ('admin', 'super_admin')
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > now())
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- 6. Create simple policies for admin_roles (after dropping all existing ones)
CREATE POLICY "service_role_all_access"
ON public.admin_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "users_view_own_roles"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ===============================
-- PART 2: FIX USER_PROFILES ACCESS
-- ===============================

-- 1. Disable RLS temporarily
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- 3. Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create simple policies for user_profiles
CREATE POLICY "service_role_all_access"
ON public.user_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "users_access_own_profile"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 5. Create a policy for admins to access all profiles
CREATE POLICY "admins_access_all_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.admin_roles 
        WHERE user_id = auth.uid() 
        AND role_type IN ('admin', 'super_admin')
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.admin_roles 
        WHERE user_id = auth.uid() 
        AND role_type IN ('admin', 'super_admin')
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
);

-- ===============================
-- PART 3: FIX ANALYTICS_EVENTS ACCESS
-- ===============================

-- 1. Disable RLS temporarily
ALTER TABLE public.analytics_events DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'analytics_events'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.analytics_events', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- 3. Re-enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 4. Create simple policies for analytics_events
CREATE POLICY "service_role_all_access"
ON public.analytics_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "users_access_own_events"
ON public.analytics_events
FOR ALL
TO authenticated
USING (
    -- Users can access their own events
    user_id = auth.uid() 
    OR 
    -- Admins can access all events
    EXISTS (
        SELECT 1 
        FROM public.admin_roles 
        WHERE user_id = auth.uid() 
        AND role_type IN ('admin', 'super_admin')
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
    OR
    -- Anonymous events are accessible
    user_id IS NULL
)
WITH CHECK (
    -- Users can modify their own events
    user_id = auth.uid() 
    OR 
    -- Admins can modify all events
    EXISTS (
        SELECT 1 
        FROM public.admin_roles 
        WHERE user_id = auth.uid() 
        AND role_type IN ('admin', 'super_admin')
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
    OR
    -- Anonymous events can be created
    user_id IS NULL
);

-- ===============================
-- PART 4: FIX CONVERSATION_MESSAGES ACCESS
-- ===============================

-- 1. Check if conversation_messages table exists before trying to modify it
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_messages'
  ) THEN
    -- Disable RLS temporarily
    EXECUTE 'ALTER TABLE public.conversation_messages DISABLE ROW LEVEL SECURITY';
    
    -- Drop existing policies
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'conversation_messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversation_messages', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    -- Re-enable RLS
    EXECUTE 'ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY';
    
    -- Create simple policies for conversation_messages
    EXECUTE 'CREATE POLICY "service_role_all_access" ON public.conversation_messages FOR ALL TO service_role USING (true) WITH CHECK (true)';
    
    EXECUTE 'CREATE POLICY "users_access_own_messages" ON public.conversation_messages FOR ALL TO authenticated USING (
      user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid() AND role_type IN (''admin'', ''super_admin'') AND is_active = true AND (expires_at IS NULL OR expires_at > now())
      )
    ) WITH CHECK (
      user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid() AND role_type IN (''admin'', ''super_admin'') AND is_active = true AND (expires_at IS NULL OR expires_at > now())
      )
    )';
  END IF;
END $$;

-- ===============================
-- PART 5: CREATE ADMIN FUNCTION FOR DIRECT ACCESS
-- ===============================

-- Create a function to get user profiles directly
DROP FUNCTION IF EXISTS get_all_user_profiles();
CREATE OR REPLACE FUNCTION get_all_user_profiles()
RETURNS TABLE (
    id UUID,
    email TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        up.created_at,
        up.updated_at
    FROM 
        public.user_profiles up;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_user_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_user_profiles() TO service_role;

-- Create a function to get analytics events directly
DROP FUNCTION IF EXISTS get_all_analytics_events();
CREATE OR REPLACE FUNCTION get_all_analytics_events()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    event_type TEXT,
    event_timestamp TIMESTAMPTZ,
    page_path TEXT,
    session_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.id,
        ae.user_id,
        ae.event_type,
        ae.event_timestamp,
        ae.page_path,
        ae.session_id
    FROM 
        public.analytics_events ae;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_analytics_events() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_analytics_events() TO service_role;

-- Create a function to get analytics summary
DROP FUNCTION IF EXISTS get_analytics_summary();
CREATE OR REPLACE FUNCTION get_analytics_summary()
RETURNS TABLE (
  total_users BIGINT,
  new_users_7d BIGINT,
  new_users_30d BIGINT,
  daily_active_users BIGINT,
  weekly_active_users BIGINT,
  monthly_active_users BIGINT,
  unique_visitors_30d BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_users,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::BIGINT as new_users_7d,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::BIGINT as new_users_30d,
    -- Activity metrics (from analytics_events)
    (SELECT COUNT(DISTINCT user_id)::BIGINT FROM public.analytics_events 
     WHERE event_timestamp >= NOW() - INTERVAL '1 day' AND user_id IS NOT NULL) as daily_active_users,
    (SELECT COUNT(DISTINCT user_id)::BIGINT FROM public.analytics_events 
     WHERE event_timestamp >= NOW() - INTERVAL '7 days' AND user_id IS NOT NULL) as weekly_active_users,
    (SELECT COUNT(DISTINCT user_id)::BIGINT FROM public.analytics_events 
     WHERE event_timestamp >= NOW() - INTERVAL '30 days' AND user_id IS NOT NULL) as monthly_active_users,
    -- Visitor metrics (from analytics_events)
    (SELECT COUNT(DISTINCT COALESCE(user_id, session_id))::BIGINT FROM public.analytics_events 
     WHERE event_timestamp >= NOW() - INTERVAL '30 days') as unique_visitors_30d
  FROM public.user_profiles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_analytics_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_summary() TO service_role;

-- ===============================
-- PART 6: VERIFY ACCESS
-- ===============================

-- Check user count
SELECT COUNT(*) FROM public.user_profiles;

-- Check analytics events count
SELECT COUNT(*) FROM public.analytics_events;





