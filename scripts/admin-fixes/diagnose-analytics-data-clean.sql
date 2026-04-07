-- CLEAN DIAGNOSTIC SCRIPT: Why is analytics_events empty?
-- Run this in Supabase SQL Editor to understand the root cause

-- 1. Check if analytics_events table exists and has data
SELECT 
  'analytics_events table check' as check_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as records_with_user_id,
  COUNT(CASE WHEN session_id IS NOT NULL THEN 1 END) as records_with_session_id,
  MIN(event_timestamp) as earliest_event,
  MAX(event_timestamp) as latest_event,
  COUNT(DISTINCT event_type) as unique_event_types,
  array_agg(DISTINCT event_type) as all_event_types
FROM public.analytics_events;

-- 2. Check if there are any events at all
SELECT 
  'all events check' as check_name,
  COUNT(*) as total_events,
  COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_views,
  COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks,
  COUNT(CASE WHEN event_type = 'form_submit' THEN 1 END) as form_submits
FROM public.analytics_events;

-- 3. Check if events are being inserted but filtered out
SELECT 
  'event insertion check' as check_name,
  COUNT(*) as total_events,
  COUNT(CASE WHEN event_timestamp IS NOT NULL THEN 1 END) as has_event_timestamp,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as has_user_id,
  COUNT(CASE WHEN session_id IS NOT NULL THEN 1 END) as has_session_id
FROM public.analytics_events;

-- 4. Check if there are any events in the last 30 days
SELECT 
  'recent events check' as check_name,
  COUNT(*) as events_last_30d,
  COUNT(CASE WHEN event_timestamp >= NOW() - INTERVAL '30 days' THEN 1 END) as events_last_30d_timestamp
FROM public.analytics_events;

-- 5. Check table structure
SELECT 
  'table structure check' as check_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'analytics_events' 
ORDER BY ordinal_position;

-- 6. Check RLS policies
SELECT 
  'RLS policies check' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'analytics_events';

-- 7. Check service role access
SELECT 
  'service_role access check' as check_name,
  COUNT(*) as records_visible_to_service_role
FROM public.analytics_events;

-- 8. Check recent frontend events
SELECT 
  'frontend event tracking check' as check_name,
  COUNT(*) as total_events,
  COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_views,
  COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks,
  COUNT(CASE WHEN event_type = 'form_submit' THEN 1 END) as form_submits
FROM public.analytics_events 
WHERE event_timestamp >= NOW() - INTERVAL '7 days';
