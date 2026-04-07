-- Cohort Analysis Verification Script
-- Run this to verify cohort calculations are working correctly
-- Date: 2025-10-13

\echo '=========================================='
\echo 'COHORT ANALYSIS VERIFICATION'
\echo '=========================================='
\echo ''

-- 1. Check data prerequisites
\echo '1. DATA PREREQUISITES CHECK'
\echo '------------------------------------------'

\echo 'Checking user_profiles table...'
SELECT
    COUNT(*) as total_users,
    COUNT(created_at) as users_with_created_at,
    MIN(created_at) as earliest_user,
    MAX(created_at) as latest_user,
    COUNT(*) - COUNT(created_at) as missing_created_at
FROM user_profiles;

\echo ''
\echo 'Checking analytics_events table...'
SELECT
    COUNT(*) as total_events,
    COUNT(event_timestamp) as events_with_timestamp,
    COUNT(DISTINCT user_id) as unique_users_with_events,
    MIN(event_timestamp) as earliest_event,
    MAX(event_timestamp) as latest_event,
    COUNT(*) - COUNT(event_timestamp) as missing_timestamps
FROM analytics_events;

\echo ''
\echo 'User signup timeline (last 30 days)...'
SELECT
    DATE(created_at) as signup_date,
    COUNT(*) as users
FROM user_profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date DESC
LIMIT 10;

\echo ''
\echo '=========================================='
\echo '2. COHORT FUNCTION EXISTENCE CHECK'
\echo '=========================================='

SELECT
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname LIKE '%cohort%'
ORDER BY proname;

\echo ''
\echo '=========================================='
\echo '3. TEST COHORT FUNCTIONS'
\echo '=========================================='

\echo ''
\echo 'Testing get_cohort_analysis_data(week)...'
SELECT
    cohort_period,
    cohort_size,
    period_0,
    period_1,
    period_2,
    period_3,
    period_4,
    ROUND((period_1::numeric / NULLIF(period_0, 0) * 100), 1) as week1_retention,
    ROUND((period_2::numeric / NULLIF(period_0, 0) * 100), 1) as week2_retention,
    ROUND((period_3::numeric / NULLIF(period_0, 0) * 100), 1) as week3_retention,
    ROUND((period_4::numeric / NULLIF(period_0, 0) * 100), 1) as week4_retention
FROM get_cohort_analysis_data('week')
ORDER BY cohort_period DESC
LIMIT 5;

\echo ''
\echo '=========================================='
\echo '4. DATA INTEGRITY CHECKS'
\echo '=========================================='

\echo ''
\echo 'Checking for impossible retention (retention > 100%)...'
SELECT
    cohort_period,
    cohort_size,
    period_0,
    period_1,
    period_2,
    period_3,
    period_4,
    CASE
        WHEN period_1 > period_0 THEN 'FAIL: Period 1 > Period 0'
        WHEN period_2 > period_0 THEN 'FAIL: Period 2 > Period 0'
        WHEN period_3 > period_0 THEN 'FAIL: Period 3 > Period 0'
        WHEN period_4 > period_0 THEN 'FAIL: Period 4 > Period 0'
        ELSE 'PASS'
    END as integrity_check
FROM get_cohort_analysis_data('week')
WHERE period_1 > period_0
   OR period_2 > period_0
   OR period_3 > period_0
   OR period_4 > period_0;

\echo ''
\echo 'If no rows above, all cohorts pass integrity check! ✓'

\echo ''
\echo 'Checking for decreasing retention pattern...'
WITH cohort_data AS (
    SELECT
        cohort_period,
        period_0,
        period_1,
        period_2,
        period_3,
        period_4
    FROM get_cohort_analysis_data('week')
    WHERE period_0 > 0
)
SELECT
    cohort_period,
    period_0,
    period_1,
    period_2,
    period_3,
    period_4,
    CASE
        WHEN period_1 <= period_0
         AND period_2 <= period_1
         AND period_3 <= period_2
         AND period_4 <= period_3 THEN 'PASS: Decreasing pattern'
        ELSE 'WARNING: Non-decreasing pattern (may be OK for small cohorts)'
    END as pattern_check
FROM cohort_data
ORDER BY cohort_period DESC
LIMIT 10;

\echo ''
\echo '=========================================='
\echo '5. COHORT PERIOD VALIDATION'
\echo '=========================================='

\echo ''
\echo 'Verifying weekly periods are 7 days apart...'
WITH cohort_dates AS (
    SELECT
        cohort_period::timestamp as cohort_date,
        LEAD(cohort_period::timestamp) OVER (ORDER BY cohort_period) as next_cohort_date
    FROM get_cohort_analysis_data('week')
)
SELECT
    cohort_date,
    next_cohort_date,
    EXTRACT(DAYS FROM (next_cohort_date - cohort_date)) as days_between,
    CASE
        WHEN EXTRACT(DAYS FROM (next_cohort_date - cohort_date)) = 7 THEN 'PASS'
        WHEN next_cohort_date IS NULL THEN 'N/A (Last cohort)'
        ELSE 'FAIL: Should be 7 days'
    END as validation
FROM cohort_dates
ORDER BY cohort_date DESC
LIMIT 5;

\echo ''
\echo '=========================================='
\echo '6. SAMPLE COHORT DEEP DIVE'
\echo '=========================================='

\echo ''
\echo 'Analyzing most recent cohort in detail...'
WITH latest_cohort AS (
    SELECT
        cohort_period::timestamp as cohort_date,
        cohort_size
    FROM get_cohort_analysis_data('week')
    ORDER BY cohort_period DESC
    LIMIT 1
),
cohort_users AS (
    SELECT id, created_at
    FROM user_profiles
    WHERE DATE_TRUNC('week', created_at) = (SELECT cohort_date FROM latest_cohort)
),
user_activity AS (
    SELECT
        cu.id as user_id,
        cu.created_at,
        COUNT(ae.id) FILTER (WHERE ae.event_timestamp >= cu.created_at + INTERVAL '7 days'
                             AND ae.event_timestamp < cu.created_at + INTERVAL '14 days') as week1_events,
        COUNT(ae.id) FILTER (WHERE ae.event_timestamp >= cu.created_at + INTERVAL '14 days'
                             AND ae.event_timestamp < cu.created_at + INTERVAL '21 days') as week2_events,
        COUNT(ae.id) FILTER (WHERE ae.event_timestamp >= cu.created_at + INTERVAL '21 days'
                             AND ae.event_timestamp < cu.created_at + INTERVAL '28 days') as week3_events,
        COUNT(ae.id) FILTER (WHERE ae.event_timestamp >= cu.created_at + INTERVAL '28 days'
                             AND ae.event_timestamp < cu.created_at + INTERVAL '35 days') as week4_events
    FROM cohort_users cu
    LEFT JOIN analytics_events ae ON cu.id = ae.user_id
    GROUP BY cu.id, cu.created_at
)
SELECT
    (SELECT cohort_date FROM latest_cohort) as cohort_date,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE week1_events > 0) as active_week1,
    COUNT(*) FILTER (WHERE week2_events > 0) as active_week2,
    COUNT(*) FILTER (WHERE week3_events > 0) as active_week3,
    COUNT(*) FILTER (WHERE week4_events > 0) as active_week4,
    ROUND(COUNT(*) FILTER (WHERE week1_events > 0)::numeric / COUNT(*) * 100, 1) as week1_retention_pct,
    ROUND(COUNT(*) FILTER (WHERE week2_events > 0)::numeric / COUNT(*) * 100, 1) as week2_retention_pct,
    ROUND(COUNT(*) FILTER (WHERE week3_events > 0)::numeric / COUNT(*) * 100, 1) as week3_retention_pct,
    ROUND(COUNT(*) FILTER (WHERE week4_events > 0)::numeric / COUNT(*) * 100, 1) as week4_retention_pct
FROM user_activity;

\echo ''
\echo '=========================================='
\echo '7. TIMEZONE CONSISTENCY CHECK'
\echo '=========================================='

\echo ''
\echo 'Checking timezone consistency...'
SELECT
    'user_profiles.created_at' as field,
    pg_typeof(created_at) as data_type,
    MIN(created_at) as min_value,
    MAX(created_at) as max_value
FROM user_profiles
UNION ALL
SELECT
    'analytics_events.event_timestamp' as field,
    pg_typeof(event_timestamp) as data_type,
    MIN(event_timestamp) as min_value,
    MAX(event_timestamp) as max_value
FROM analytics_events;

\echo ''
\echo 'Current database timezone:'
SHOW timezone;

\echo ''
\echo '=========================================='
\echo '8. PERFORMANCE CHECK'
\echo '=========================================='

\echo ''
\echo 'Testing function execution time...'
EXPLAIN ANALYZE
SELECT * FROM get_cohort_analysis_data('week');

\echo ''
\echo '=========================================='
\echo '9. MATERIALIZED VIEW STATUS'
\echo '=========================================='

\echo ''
\echo 'Checking if cohort_analysis_data materialized view exists...'
SELECT
    schemaname,
    matviewname,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size,
    last_refresh
FROM pg_matviews
WHERE matviewname LIKE '%cohort%';

\echo ''
\echo 'Sample from materialized view (if exists)...'
SELECT
    cohort_type,
    cohort_date,
    cohort_size,
    period_0,
    period_1,
    period_2,
    ROUND((period_1::numeric / NULLIF(period_0, 0) * 100), 1) as retention_pct
FROM cohort_analysis_data
WHERE cohort_type = 'weekly'
ORDER BY cohort_date DESC
LIMIT 5;

\echo ''
\echo '=========================================='
\echo '10. SUMMARY & RECOMMENDATIONS'
\echo '=========================================='

WITH summary AS (
    SELECT
        COUNT(*) as total_cohorts,
        SUM(cohort_size) as total_users_tracked,
        AVG(CASE WHEN period_0 > 0 THEN period_1::numeric / period_0 * 100 END) as avg_week1_retention,
        AVG(CASE WHEN period_0 > 0 THEN period_2::numeric / period_0 * 100 END) as avg_week2_retention,
        MAX(CASE
            WHEN period_1 > period_0 OR period_2 > period_0
              OR period_3 > period_0 OR period_4 > period_0 THEN 1
            ELSE 0
        END) as has_integrity_issues
    FROM get_cohort_analysis_data('week')
)
SELECT
    total_cohorts,
    total_users_tracked,
    ROUND(avg_week1_retention, 1) || '%' as avg_week1_retention,
    ROUND(avg_week2_retention, 1) || '%' as avg_week2_retention,
    CASE
        WHEN has_integrity_issues = 1 THEN '❌ FAILED'
        WHEN total_cohorts = 0 THEN '⚠️  NO DATA'
        WHEN avg_week1_retention IS NULL THEN '⚠️  INSUFFICIENT DATA'
        ELSE '✅ PASSED'
    END as overall_status
FROM summary;

\echo ''
\echo '=========================================='
\echo 'VERIFICATION COMPLETE'
\echo '=========================================='
\echo ''
\echo 'Next steps:'
\echo '1. Review any FAIL or WARNING messages above'
\echo '2. Check that retention percentages look reasonable'
\echo '3. Verify admin dashboard displays correctly at /admin'
\echo '4. If issues found, check scripts/admin-fixes/ for solutions'
\echo ''
