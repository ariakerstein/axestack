-- IMMEDIATE FIX for RLS Policy Conflicts
-- Run this script directly in your database to fix the 500 errors

-- Step 1: Disable RLS temporarily
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (this ensures clean slate)
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
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create working policies
CREATE POLICY "user_profiles_select_own" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "user_profiles_update_own" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_insert_own" 
ON public.user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_service_role_all" 
ON public.user_profiles 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Step 5: Verify policies are created
SELECT schemaname, tablename, policyname, cmd, permissive
FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY policyname;
