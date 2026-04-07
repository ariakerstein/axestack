-- Diagnose Cohort Analysis Issues
-- Run this in Supabase SQL Editor to understand the root cause

-- 1. Check if analytics_events table exists and has data
SELECT 
  'analytics_events table check' as check_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as records_with_user_id,
  COUNT(CASE WHEN session_id IS NOT NULL THEN 1 END) as records_with_session_id,
  MIN(event_timestamp) as earliest_event,
  MAX(event_timestamp) as latest_event
FROM public.analytics_events;

-- 2. Check if user_profiles table has data
SELECT 
  'user_profiles table check' as check_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as records_with_email,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM public.user_profiles;

-- 3. Check if there's a date mismatch between user_profiles and analytics_events
WITH user_date_range AS (
  SELECT 
    MIN(created_at) as earliest_user,
    MAX(created_at) as latest_user
  FROM public.user_profiles
),
analytics_date_range AS (
  SELECT 
    MIN(event_timestamp) as earliest_event,
    MAX(event_timestamp) as latest_event
  FROM public.analytics_events
)
SELECT 
  'date range comparison' as check_name,
  u.earliest_user,
  u.latest_user,
  a.earliest_event,
  a.latest_event,
  CASE 
    WHEN u.earliest_user > a.latest_event THEN 'CRITICAL: All users created after last analytics event'
    WHEN u.latest_user < a.earliest_event THEN 'CRITICAL: All analytics events after last user created'
    ELSE 'Date ranges overlap properly'
  END as diagnosis
FROM user_date_range u, analytics_date_range a;

-- 4. Check if any users have associated analytics events
SELECT 
  'user activity check' as check_name,
  COUNT(DISTINCT up.id) as total_users,
  COUNT(DISTINCT ae.user_id) as users_with_activity,
  COUNT(DISTINCT up.id) - COUNT(DISTINCT ae.user_id) as users_without_activity,
  ROUND((COUNT(DISTINCT ae.user_id)::numeric / NULLIF(COUNT(DISTINCT up.id), 0)) * 100, 2) as percent_users_with_activity
FROM public.user_profiles up
LEFT JOIN public.analytics_events ae ON up.id = ae.user_id;

-- 5. Check RLS policies on analytics_events
SELECT 
  'analytics_events RLS policies' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'analytics_events';

-- 6. Check RLS policies on admin_roles
SELECT 
  'admin_roles RLS policies' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'admin_roles';

-- 7. Check if admin_roles table has data
SELECT 
  'admin_roles table check' as check_name,
  COUNT(*) as total_records
FROM public.admin_roles;

-- 8. Check if there are any users in the system with created_at date in 2023
SELECT 
  'users in 2023 check' as check_name,
  COUNT(*) as total_users_2023
FROM public.user_profiles
WHERE created_at >= '2023-01-01' AND created_at < '2024-01-01';

-- 9. Check if there are any users in the system with created_at date in 2024
SELECT 
  'users in 2024 check' as check_name,
  COUNT(*) as total_users_2024
FROM public.user_profiles
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';

-- 10. Check if there are any users in the system with created_at date in 2025
SELECT 
  'users in 2025 check' as check_name,
  COUNT(*) as total_users_2025
FROM public.user_profiles
WHERE created_at >= '2025-01-01';
