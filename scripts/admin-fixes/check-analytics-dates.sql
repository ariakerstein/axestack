-- CHECK: What's the actual date range of your analytics events?
-- This will show why your dashboard queries are returning 0 results

-- 1. Check the full date range of all events
SELECT 
  'Date Range Check' as check_name,
  COUNT(*) as total_events,
  MIN(event_timestamp) as earliest_event,
  MAX(event_timestamp) as latest_event,
  MIN(event_timestamp)::date as earliest_date,
  MAX(event_timestamp)::date as latest_date
FROM public.analytics_events;

-- 2. Check events by month to see the distribution
SELECT 
  'Events by Month' as check_name,
  DATE_TRUNC('month', event_timestamp) as month,
  COUNT(*) as event_count,
  COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_views,
  COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks
FROM public.analytics_events
GROUP BY DATE_TRUNC('month', event_timestamp)
ORDER BY month DESC;

-- 3. Check recent events (last 7 days)
SELECT 
  'Recent Events (Last 7 Days)' as check_name,
  COUNT(*) as events_last_7d,
  COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_views_7d,
  COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks_7d
FROM public.analytics_events
WHERE event_timestamp >= NOW() - INTERVAL '7 days';

-- 4. Check events from the last 30 days
SELECT 
  'Recent Events (Last 30 Days)' as check_name,
  COUNT(*) as events_last_30d,
  COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_views_30d,
  COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks_30d
FROM public.analytics_events
WHERE event_timestamp >= NOW() - INTERVAL '30 days';

-- 5. Check if there are any events with user_id (for active user calculations)
SELECT 
  'User Activity Check' as check_name,
  COUNT(*) as total_events,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as events_with_user_id,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as events_without_user_id,
  COUNT(DISTINCT user_id) as unique_users_with_events
FROM public.analytics_events;
