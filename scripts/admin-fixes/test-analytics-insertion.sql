-- TEST: Can we insert analytics events?
-- Run this in Supabase SQL Editor to test if the issue is with insertion

-- 1. Test basic insertion
INSERT INTO public.analytics_events (
  event_type,
  page_path,
  session_id,
  event_timestamp,
  metadata
) VALUES (
  'test_insertion',
  '/test',
  'test-session-123',
  NOW(),
  '{"test": true, "message": "Testing if analytics insertion works"}'
) RETURNING id, event_type, created_at, event_timestamp;

-- 2. Check if the insert worked
SELECT 
  'Insertion test result' as test_name,
  COUNT(*) as total_events,
  COUNT(CASE WHEN event_type = 'test_insertion' THEN 1 END) as test_events,
  MIN(event_timestamp) as earliest,
  MAX(event_timestamp) as latest
FROM public.analytics_events;

-- 3. Check if there are any events at all
SELECT 
  'Current analytics state' as check_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_views,
  COUNT(CASE WHEN event_type = 'session_start' THEN 1 END) as session_starts,
  COUNT(CASE WHEN event_type = 'card_engagement' THEN 1 END) as card_engagements,
  MIN(event_timestamp) as earliest_event,
  MAX(event_timestamp) as latest_event
FROM public.analytics_events;

-- 4. Check if the issue is with RLS policies
SELECT 
  'RLS policy check' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'analytics_events';
