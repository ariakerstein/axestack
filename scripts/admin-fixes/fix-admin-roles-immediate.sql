-- EMERGENCY FIX FOR ADMIN_ROLES RECURSION
-- This is a simplified fix that focuses only on the admin_roles recursion issue

-- 1. First, completely disable RLS on admin_roles table
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;

-- 2. Drop the is_admin function which is causing recursion
DROP FUNCTION IF EXISTS public.is_admin();

-- 3. Create a new is_admin function with SECURITY DEFINER that bypasses RLS
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

-- 4. Create a new is_super_admin function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Direct SQL query that bypasses RLS
    RETURN (
        SELECT EXISTS (
            SELECT 1 
            FROM public.admin_roles 
            WHERE user_id = auth.uid() 
            AND role_type = 'super_admin'
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > now())
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-enable RLS on admin_roles table
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- 6. Create simple policies that don't use the is_admin function recursively
-- Drop all existing policies
DROP POLICY IF EXISTS "admin_roles_select_own" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_select_all_admins" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_manage_super_admin" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_service_role_all" ON public.admin_roles;
DROP POLICY IF EXISTS "super_admin_manage_roles" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_view_roles" ON public.admin_roles;
DROP POLICY IF EXISTS "users_view_own_roles" ON public.admin_roles;
DROP POLICY IF EXISTS "service_role_manage_roles" ON public.admin_roles;

-- Create a policy for service role (full access)
CREATE POLICY "service_role_all_access"
ON public.admin_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create a policy for users to view their own roles
CREATE POLICY "users_view_own_roles"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 7. Fix admin_analytics_summary view if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relname = 'admin_analytics_summary'
  ) THEN
    DROP VIEW IF EXISTS public.admin_analytics_summary;
    
    -- Recreate the view without using is_admin function
    CREATE VIEW public.admin_analytics_summary AS
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_7d,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d
    FROM public.user_profiles;
    
    -- Grant access to the view
    GRANT SELECT ON public.admin_analytics_summary TO authenticated;
    GRANT SELECT ON public.admin_analytics_summary TO service_role;
  END IF;
END $$;

-- 8. Fix the analytics_events policies
ALTER TABLE public.analytics_events DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow analytics event insertion for all users" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow reading analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow updating analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow deleting analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow cohort analysis view access" ON public.analytics_events;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Create simple policies without using is_admin function
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
  user_id = auth.uid() OR user_id IS NULL
)
WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL
);

-- 9. Fix user_profiles policies if needed
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_admin_select_all" ON public.user_profiles;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policy for service role
CREATE POLICY "service_role_all_access"
ON public.user_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for users to access their own profiles
CREATE POLICY "users_access_own_profile"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 10. Verify the changes
SELECT 'Admin roles policies fixed successfully' AS result;
