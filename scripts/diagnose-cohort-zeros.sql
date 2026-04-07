-- Diagnostic queries to understand why cohort retention shows zeros
-- Run these to identify the root cause

-- 1. Check if events are happening AFTER registration
SELECT 
  'Events After Registration' as check_name,
  COUNT(*) as total_user_events,
  COUNT(CASE WHEN ae.event_timestamp > up.created_at THEN 1 END) as events_after_signup,
  COUNT(CASE WHEN ae.event_timestamp <= up.created_at THEN 1 END) as events_before_signup,
  ROUND(100.0 * COUNT(CASE WHEN ae.event_timestamp > up.created_at THEN 1 END) / COUNT(*), 2) as pct_after_signup
FROM user_profiles up
JOIN analytics_events ae ON ae.user_id = up.id
WHERE up.created_at >= NOW() - INTERVAL '6 months'
  AND ae.user_id IS NOT NULL;

-- 2. Check event distribution by days after signup
SELECT 
  'Event Timing Distribution' as check_name,
  CASE 
    WHEN EXTRACT(EPOCH FROM (ae.event_timestamp - up.created_at)) / 86400 < 0 THEN 'Before signup'
    WHEN EXTRACT(EPOCH FROM (ae.event_timestamp - up.created_at)) / 86400 BETWEEN 0 AND 6 THEN 'Days 0-6 (Period 0)'
    WHEN EXTRACT(EPOCH FROM (ae.event_timestamp - up.created_at)) / 86400 BETWEEN 7 AND 13 THEN 'Days 7-13 (Period 1)'
    WHEN EXTRACT(EPOCH FROM (ae.event_timestamp - up.created_at)) / 86400 BETWEEN 14 AND 20 THEN 'Days 14-20 (Period 2)'
    WHEN EXTRACT(EPOCH FROM (ae.event_timestamp - up.created_at)) / 86400 BETWEEN 21 AND 27 THEN 'Days 21-27 (Period 3)'
    WHEN EXTRACT(EPOCH FROM (ae.event_timestamp - up.created_at)) / 86400 BETWEEN 28 AND 34 THEN 'Days 28-34 (Period 4)'
    ELSE 'After 35 days'
  END as time_window,
  COUNT(*) as event_count,
  COUNT(DISTINCT ae.user_id) as unique_users
FROM user_profiles up
JOIN analytics_events ae ON ae.user_id = up.id
WHERE up.created_at >= NOW() - INTERVAL '6 months'
  AND ae.user_id IS NOT NULL
  AND ae.event_timestamp > up.created_at
GROUP BY time_window
ORDER BY 
  CASE time_window
    WHEN 'Before signup' THEN 0
    WHEN 'Days 0-6 (Period 0)' THEN 1
    WHEN 'Days 7-13 (Period 1)' THEN 2
    WHEN 'Days 14-20 (Period 2)' THEN 3
    WHEN 'Days 21-27 (Period 3)' THEN 4
    WHEN 'Days 28-34 (Period 4)' THEN 5
    ELSE 6
  END;

-- 3. Sample users with events but check their period 1 activity
SELECT 
  up.email,
  up.created_at as registration_date,
  COUNT(*) as total_events_after_signup,
  COUNT(CASE 
    WHEN ae.event_timestamp >= up.created_at + INTERVAL '7 days'
     AND ae.event_timestamp < up.created_at + INTERVAL '14 days'
    THEN 1 
  END) as events_in_period_1,
  MIN(ae.event_timestamp) as first_event_after_signup,
  MAX(ae.event_timestamp) as last_event
FROM user_profiles up
JOIN analytics_events ae ON ae.user_id = up.id
WHERE up.created_at >= NOW() - INTERVAL '6 months'
  AND ae.user_id IS NOT NULL
  AND ae.event_timestamp > up.created_at
GROUP BY up.id, up.email, up.created_at
HAVING COUNT(*) > 0
ORDER BY up.created_at DESC
LIMIT 10;

-- 4. Test the RPC function directly
SELECT 'RPC Function Test' as check_name;
SELECT * FROM get_cohort_analysis_data('week') LIMIT 5;
SELECT * FROM get_cohort_analysis_data('month') LIMIT 5;




