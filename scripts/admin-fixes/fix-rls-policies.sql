-- FIX RLS POLICY CONFLICTS - This resolves the 500 errors by fixing policy naming conflicts
-- The issue is that multiple migrations created policies with different names, causing conflicts

-- 1. First, disable RLS temporarily to clean up
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can manage user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Community can view public profile data" ON public.user_profiles;

DROP POLICY IF EXISTS "user_profiles_view_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_service_role_manage" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_view_all" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_community_view_public" ON public.user_profiles;

DROP POLICY IF EXISTS "Users can view their own profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON public.user_profiles;

-- 3. Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create clean, working policies with consistent naming
-- Policy 1: Users can view their own profile
CREATE POLICY "user_profiles_select_own" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Users can update their own profile
CREATE POLICY "user_profiles_update_own" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 3: Users can insert their own profile
CREATE POLICY "user_profiles_insert_own" 
ON public.user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy 4: Service role can manage all profiles (for edge functions)
CREATE POLICY "user_profiles_service_role_all" 
ON public.user_profiles 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 5: Admins can view all profiles (for support)
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

-- Policy 6: Community can view public profile data (for community features)
CREATE POLICY "user_profiles_community_select_public" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (
  show_profile = true 
  AND profile_completed = true
);

-- 5. Verify policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY policyname;
