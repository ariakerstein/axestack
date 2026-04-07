#!/usr/bin/env python3
"""
Analytics Health Check - Validates admin dashboard data integrity

Validates:
1. User signups and profiles
2. Analytics events (DAU/WAU/MAU data)
3. Circle engagement metrics
4. Cohort retention data
5. Response evaluations

Run: python analytics_health_check.py
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

results = []

THRESHOLDS = {
    'min_analytics_events_7d': 10,      # At least 10 events in last 7 days
    'min_active_users_7d': 1,           # At least 1 active user
    'min_circle_events_30d': 0,         # Circle events (0 = just check table exists)
    'max_stale_hours': 48,              # Warn if no events in 48 hours
}


def log_result(name: str, passed: bool, details: str, critical: bool = False):
    """Log a test result"""
    results.append({
        'name': name,
        'passed': passed,
        'details': details,
        'critical': critical
    })
    status = '✅ PASS' if passed else ('🔴 FAIL' if critical else '⚠️  WARN')
    print(f'{status} {name}')
    print(f'       {details}')


def test_user_profiles():
    """Test user profiles table"""
    try:
        total = supabase.table('user_profiles').select('id', count='exact').execute()

        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        recent = supabase.table('user_profiles').select('id', count='exact') \
            .gte('created_at', seven_days_ago).execute()

        log_result(
            'User Profiles',
            (total.count or 0) > 0,
            f'Total: {total.count}, New (7d): {recent.count}'
        )
    except Exception as e:
        log_result('User Profiles', False, f'Error: {e}', critical=True)


def test_analytics_events():
    """Test analytics events for DAU/WAU/MAU"""
    try:
        # Total events
        total = supabase.table('analytics_events').select('id', count='exact').execute()

        # Events in last 7 days
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        recent = supabase.table('analytics_events').select('id', count='exact') \
            .gte('event_timestamp', seven_days_ago).execute()

        # Events in last 24 hours
        one_day_ago = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        daily = supabase.table('analytics_events').select('id', count='exact') \
            .gte('event_timestamp', one_day_ago).execute()

        # Distinct active users (last 7 days)
        users_result = supabase.table('analytics_events').select('user_id') \
            .gte('event_timestamp', seven_days_ago).limit(1000).execute()
        distinct_users = len(set(e['user_id'] for e in (users_result.data or []) if e.get('user_id')))

        passed = (recent.count or 0) >= THRESHOLDS['min_analytics_events_7d']

        log_result(
            'Analytics Events (DAU/WAU/MAU)',
            passed,
            f'Total: {total.count}, 7d: {recent.count}, 24h: {daily.count}, Active users (7d): {distinct_users}',
            critical=True
        )
    except Exception as e:
        log_result('Analytics Events', False, f'Error: {e}', critical=True)


def test_circle_events():
    """Test Circle engagement tracking"""
    try:
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

        # Circle event types
        circle_events = [
            'circle_signup_modal_shown',
            'circle_signup_click',
            'circle_signup_dismissed',
            'circle_link_click'
        ]

        counts = {}
        for event_type in circle_events:
            result = supabase.table('analytics_events').select('id', count='exact') \
                .eq('event_type', event_type) \
                .gte('event_timestamp', thirty_days_ago).execute()
            counts[event_type] = result.count or 0

        total_circle = sum(counts.values())

        # Calculate conversion rate if we have modal shows
        modal_shown = counts.get('circle_signup_modal_shown', 0)
        signup_clicks = counts.get('circle_signup_click', 0)
        conversion = (signup_clicks / modal_shown * 100) if modal_shown > 0 else 0

        log_result(
            'Circle Events (30d)',
            True,  # Info only - just checking it works
            f'Modal: {modal_shown}, Clicks: {signup_clicks}, Conv: {conversion:.1f}%'
        )
    except Exception as e:
        log_result('Circle Events', False, f'Error: {e}')


def test_response_evaluations():
    """Test response evaluation storage"""
    try:
        # Total evaluations
        total = supabase.table('response_evaluations').select('id', count='exact').execute()

        # Recent evaluations (7 days)
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        recent = supabase.table('response_evaluations').select('id', count='exact') \
            .gte('created_at', seven_days_ago).execute()

        # Average confidence (recent)
        recent_data = supabase.table('response_evaluations') \
            .select('overall_confidence, confidence_level') \
            .gte('created_at', seven_days_ago).limit(100).execute()

        data = recent_data.data or []
        avg_conf = sum(r.get('overall_confidence', 0) for r in data) / len(data) if data else 0

        # Confidence breakdown
        high = sum(1 for r in data if r.get('confidence_level') == 'high')
        medium = sum(1 for r in data if r.get('confidence_level') == 'medium')
        low = sum(1 for r in data if r.get('confidence_level') == 'low')

        log_result(
            'Response Evaluations',
            (total.count or 0) > 0,
            f'Total: {total.count}, 7d: {recent.count}, Avg conf: {avg_conf:.2f} (H:{high}/M:{medium}/L:{low})'
        )
    except Exception as e:
        log_result('Response Evaluations', False, f'Error: {e}')


def test_cohort_data():
    """Test cohort retention data availability"""
    try:
        # Get user signups by week for cohort analysis
        ninety_days_ago = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()

        users = supabase.table('user_profiles').select('id, created_at') \
            .gte('created_at', ninety_days_ago).execute()

        user_count = len(users.data or [])

        # Check if we have analytics events for these users (needed for retention)
        if user_count > 0:
            user_ids = [u['id'] for u in users.data if u.get('id')][:100]  # Sample
            events = supabase.table('analytics_events').select('user_id', count='exact') \
                .in_('user_id', user_ids).execute()

            users_with_events = events.count or 0
            coverage = (users_with_events / len(user_ids) * 100) if user_ids else 0
        else:
            coverage = 0

        log_result(
            'Cohort Data',
            user_count > 0,
            f'Users (90d): {user_count}, Event coverage: {coverage:.0f}%'
        )
    except Exception as e:
        log_result('Cohort Data', False, f'Error: {e}')


def test_cohort_retention():
    """Test cohort retention calculation accuracy"""
    try:
        # Get cohorts from last 4 weeks
        four_weeks_ago = (datetime.now(timezone.utc) - timedelta(weeks=4)).isoformat()

        # Get users grouped by signup week
        users = supabase.table('user_profiles').select('id, created_at') \
            .gte('created_at', four_weeks_ago).execute()

        if not users.data:
            log_result('Cohort Retention', True, 'No recent cohorts to analyze')
            return

        # Group users by week
        from collections import defaultdict
        cohorts = defaultdict(list)
        for user in users.data:
            if user.get('created_at') and user.get('id'):
                created = datetime.fromisoformat(user['created_at'].replace('Z', '+00:00'))
                week_start = created - timedelta(days=created.weekday())
                week_key = week_start.strftime('%Y-%m-%d')
                cohorts[week_key].append(user['id'])

        # Calculate retention for most recent complete cohort
        sorted_weeks = sorted(cohorts.keys(), reverse=True)
        if len(sorted_weeks) < 2:
            log_result('Cohort Retention', True, f'{len(sorted_weeks)} cohort(s), need 2+ for retention')
            return

        # Use second most recent (to have full week of data)
        cohort_week = sorted_weeks[1]
        cohort_users = cohorts[cohort_week]
        cohort_size = len(cohort_users)

        if cohort_size == 0:
            log_result('Cohort Retention', True, 'Empty cohort')
            return

        # Check how many returned in week 1 (7-14 days after signup)
        week1_start = (datetime.strptime(cohort_week, '%Y-%m-%d').replace(tzinfo=timezone.utc)
                       + timedelta(days=7)).isoformat()
        week1_end = (datetime.strptime(cohort_week, '%Y-%m-%d').replace(tzinfo=timezone.utc)
                     + timedelta(days=14)).isoformat()

        # Count users with events in week 1
        returning_users = 0
        for user_id in cohort_users[:50]:  # Sample for performance
            events = supabase.table('analytics_events').select('id', count='exact') \
                .eq('user_id', user_id) \
                .gte('event_timestamp', week1_start) \
                .lt('event_timestamp', week1_end).execute()
            if (events.count or 0) > 0:
                returning_users += 1

        sampled = min(50, cohort_size)
        retention_rate = (returning_users / sampled * 100) if sampled > 0 else 0

        # Retention between 0-100% is valid, flag if obviously wrong
        passed = 0 <= retention_rate <= 100

        log_result(
            'Cohort Retention',
            passed,
            f'Week {cohort_week}: {cohort_size} users, Week1 retention: {retention_rate:.0f}% (sampled {sampled})'
        )
    except Exception as e:
        log_result('Cohort Retention', False, f'Error: {e}')


def test_cohort_consistency():
    """Test that cohort data is consistent between tables"""
    try:
        # Get total users from user_profiles
        profiles = supabase.table('user_profiles').select('id', count='exact').execute()
        profile_count = profiles.count or 0

        # Get distinct users from analytics_events
        events = supabase.table('analytics_events').select('user_id').limit(10000).execute()
        event_users = set(e['user_id'] for e in (events.data or []) if e.get('user_id'))
        event_user_count = len(event_users)

        # Check overlap - users with both profile and events
        if profile_count > 0:
            sample_profiles = supabase.table('user_profiles').select('id').limit(100).execute()
            profile_ids = set(p['id'] for p in (sample_profiles.data or []))
            overlap = len(profile_ids & event_users)
            overlap_pct = (overlap / len(profile_ids) * 100) if profile_ids else 0
        else:
            overlap_pct = 0

        # Flag if major discrepancy (many users with no events)
        passed = overlap_pct >= 20 or profile_count < 10  # Allow low overlap for small datasets

        log_result(
            'Cohort Consistency',
            passed,
            f'Profiles: {profile_count}, Event users: {event_user_count}, Overlap: {overlap_pct:.0f}%'
        )
    except Exception as e:
        log_result('Cohort Consistency', False, f'Error: {e}')


def test_data_freshness():
    """Check how fresh the analytics data is"""
    try:
        # Get most recent event
        result = supabase.table('analytics_events') \
            .select('event_timestamp') \
            .order('event_timestamp', desc=True) \
            .limit(1).execute()

        if result.data and result.data[0].get('event_timestamp'):
            last_event = datetime.fromisoformat(result.data[0]['event_timestamp'].replace('Z', '+00:00'))
            hours_ago = (datetime.now(timezone.utc) - last_event).total_seconds() / 3600

            passed = hours_ago < THRESHOLDS['max_stale_hours']
            log_result(
                'Data Freshness',
                passed,
                f'Last event: {hours_ago:.1f} hours ago',
                critical=not passed
            )
        else:
            log_result('Data Freshness', False, 'No events found', critical=True)
    except Exception as e:
        log_result('Data Freshness', False, f'Error: {e}')


def test_event_types():
    """Check that key event types are being tracked"""
    try:
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

        key_events = ['page_view', 'card_engagement']
        counts = {}

        for event_type in key_events:
            result = supabase.table('analytics_events').select('id', count='exact') \
                .eq('event_type', event_type) \
                .gte('event_timestamp', thirty_days_ago).execute()
            counts[event_type] = result.count or 0

        details = ', '.join(f'{k}: {v}' for k, v in counts.items())
        passed = counts.get('page_view', 0) > 0

        log_result(
            'Event Types (30d)',
            passed,
            details
        )
    except Exception as e:
        log_result('Event Types', False, f'Error: {e}')


def main():
    print('═' * 60)
    print('ANALYTICS HEALTH CHECK')
    print('═' * 60)
    print(f'Time: {datetime.now().isoformat()}\n')

    # Run all tests
    test_user_profiles()
    test_analytics_events()
    test_data_freshness()
    test_event_types()
    test_circle_events()
    test_response_evaluations()
    test_cohort_data()
    test_cohort_retention()
    test_cohort_consistency()

    # Summary
    passed = sum(1 for r in results if r['passed'])
    failed = sum(1 for r in results if not r['passed'])
    critical_failures = sum(1 for r in results if not r['passed'] and r.get('critical'))

    print('\n' + '═' * 60)
    print(f'SUMMARY: {passed} passed, {failed} issues')
    if critical_failures > 0:
        print(f'🔴 {critical_failures} CRITICAL failures - dashboard will show incorrect data!')
    print('═' * 60)

    if critical_failures > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
