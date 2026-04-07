-- Fix admin_roles recursion issue
-- This script addresses the "infinite recursion detected in policy for relation 'admin_roles'" error

-- 1. Disable RLS temporarily to fix policies
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies on admin_roles to start fresh
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

-- 3. Re-enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create new policies without recursion
-- Policy for super_admins to manage all admin roles
CREATE POLICY "super_admin_manage_roles"
ON public.admin_roles
FOR ALL
TO authenticated
USING (
    -- Check if the current user is a super_admin directly from the table
    -- without using the is_admin() function (which causes recursion)
    EXISTS (
        SELECT 1 
        FROM public.admin_roles 
        WHERE user_id = auth.uid() 
        AND role_type = 'super_admin'
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
)
WITH CHECK (
    -- Same condition for insert/update
    EXISTS (
        SELECT 1 
        FROM public.admin_roles 
        WHERE user_id = auth.uid() 
        AND role_type = 'super_admin'
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
);

-- Policy for admins to view all admin roles
CREATE POLICY "admin_view_roles"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (
    -- Check if the current user is an admin directly from the table
    EXISTS (
        SELECT 1 
        FROM public.admin_roles 
        WHERE user_id = auth.uid() 
        AND role_type IN ('admin', 'super_admin')
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
);

-- Policy for users to view their own admin roles
CREATE POLICY "users_view_own_roles"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- 5. Grant appropriate permissions to the service_role
CREATE POLICY "service_role_manage_roles"
ON public.admin_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Fix the is_admin function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    is_admin_user BOOLEAN;
BEGIN
    -- Direct query to check if user is admin without using RLS
    SELECT EXISTS (
        SELECT 1 
        FROM public.admin_roles 
        WHERE user_id = auth.uid() 
        AND role_type IN ('admin', 'super_admin')
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    ) INTO is_admin_user;
    
    RETURN is_admin_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a migration file to ensure this fix is applied in all environments
-- This should be added to the migrations directory as 20250103000004_fix_admin_roles_recursion.sql
