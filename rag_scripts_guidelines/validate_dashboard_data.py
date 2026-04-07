#!/usr/bin/env python3
"""
Validate that all evaluation scores and feedback are properly populating the dashboard.
"""

import os
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime, timedelta

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")

print_section("DASHBOARD DATA VALIDATION")
print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

# 1. CHECK RESPONSE_EVALUATIONS TABLE
print_section("1. RESPONSE_EVALUATIONS TABLE STATUS")

# Get last 24 hours
one_day_ago = (datetime.now() - timedelta(hours=24)).isoformat()

evals = supabase.table('response_evaluations')\
    .select('*')\
    .gte('created_at', one_day_ago)\
    .order('created_at', desc=True)\
    .limit(20)\
    .execute()

print(f"✅ Found {len(evals.data)} evaluations in last 24 hours\n")

if evals.data:
    # Check if all required fields are populated
    required_fields = [
        'id', 'question', 'answer', 'overall_confidence', 'confidence_level',
        'accuracy_score', 'completeness_score', 'source_support_score',
        'total_latency_ms', 'search_latency_ms', 'llm_latency_ms',
        'evaluation_latency_ms', 'cancer_type', 'source', 'model_used'
    ]

    print("Field population check (most recent record):")
    sample = evals.data[0]

    for field in required_fields:
        value = sample.get(field)
        if value is not None and value != '':
            status = "✅"
        else:
            status = "⚠️"
        print(f"  {status} {field}: {value}")

    # Score distribution
    print(f"\nScore Distribution (last 20):")
    scores = [e.get('overall_confidence', 0) for e in evals.data]
    confidence_levels = {}
    for e in evals.data:
        level = e.get('confidence_level', 'unknown')
        confidence_levels[level] = confidence_levels.get(level, 0) + 1

    avg_score = sum(scores) / len(scores) if scores else 0
    print(f"  Average Score: {avg_score:.2f}/10")
    print(f"  Min Score: {min(scores):.1f}")
    print(f"  Max Score: {max(scores):.1f}")
    print(f"\n  Confidence Levels:")
    for level, count in sorted(confidence_levels.items(), key=lambda x: x[1], reverse=True):
        print(f"    {level}: {count} ({count/len(evals.data)*100:.1f}%)")

    # Source distribution
    print(f"\n  Source Distribution:")
    sources = {}
    for e in evals.data:
        source = e.get('source', 'unknown')
        sources[source] = sources.get(source, 0) + 1

    for source, count in sorted(sources.items(), key=lambda x: x[1], reverse=True):
        print(f"    {source}: {count} ({count/len(evals.data)*100:.1f}%)")

    # Latency stats
    latencies = [e.get('total_latency_ms', 0) for e in evals.data if e.get('total_latency_ms')]
    if latencies:
        print(f"\n  Latency Stats:")
        print(f"    Average: {sum(latencies)/len(latencies):.0f}ms ({sum(latencies)/len(latencies)/1000:.2f}s)")
        print(f"    Min: {min(latencies):.0f}ms")
        print(f"    Max: {max(latencies):.0f}ms")

else:
    print("❌ No evaluations found in last 24 hours!")

# 2. CHECK RESPONSE_FEEDBACK TABLE
print_section("2. RESPONSE_FEEDBACK TABLE STATUS")

feedback = supabase.table('response_feedback')\
    .select('*')\
    .gte('created_at', one_day_ago)\
    .order('created_at', desc=True)\
    .limit(20)\
    .execute()

print(f"Found {len(feedback.data)} user feedback entries in last 24 hours\n")

if feedback.data:
    # Feedback distribution
    ratings = {}
    for f in feedback.data:
        rating = f.get('rating', 'unknown')
        ratings[rating] = ratings.get(rating, 0) + 1

    print("  Feedback Distribution:")
    for rating, count in sorted(ratings.items(), key=lambda x: x[1], reverse=True):
        print(f"    {rating}: {count} ({count/len(feedback.data)*100:.1f}%)")

    # Check for comments
    with_comments = sum(1 for f in feedback.data if f.get('comment'))
    print(f"\n  Feedback with comments: {with_comments}/{len(feedback.data)} ({with_comments/len(feedback.data)*100:.1f}%)")

    # Sample recent feedback
    print(f"\n  Most recent feedback:")
    for f in feedback.data[:3]:
        rating = f.get('rating', 'unknown')
        comment = f.get('comment', 'No comment')
        created = f.get('created_at', '')
        print(f"    {rating}: \"{comment}\" ({created[:19]})")
else:
    print("  No user feedback in last 24 hours")
    print("  This is normal if users haven't submitted feedback yet")

# 3. CHECK DATA FRESHNESS
print_section("3. DATA FRESHNESS CHECK")

# Most recent evaluation
if evals.data:
    most_recent_eval = evals.data[0]
    created_at = datetime.fromisoformat(most_recent_eval['created_at'].replace('Z', '+00:00'))
    age_minutes = (datetime.now(created_at.tzinfo) - created_at).total_seconds() / 60

    print(f"Most recent evaluation:")
    print(f"  Created: {created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Age: {age_minutes:.1f} minutes ago")
    print(f"  Question: {most_recent_eval.get('question', '')[:80]}...")
    print(f"  Score: {most_recent_eval.get('overall_confidence')}/10")
    print(f"  Confidence: {most_recent_eval.get('confidence_level')}")

    if age_minutes < 5:
        print(f"  ✅ Very fresh data (< 5 min)")
    elif age_minutes < 60:
        print(f"  ✅ Fresh data (< 1 hour)")
    elif age_minutes < 1440:
        print(f"  ⚠️  Data is {age_minutes/60:.1f} hours old")
    else:
        print(f"  ❌ Data is {age_minutes/1440:.1f} days old")

# Most recent feedback
if feedback.data:
    most_recent_fb = feedback.data[0]
    created_at_fb = datetime.fromisoformat(most_recent_fb['created_at'].replace('Z', '+00:00'))
    age_minutes_fb = (datetime.now(created_at_fb.tzinfo) - created_at_fb).total_seconds() / 60

    print(f"\nMost recent feedback:")
    print(f"  Created: {created_at_fb.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Age: {age_minutes_fb:.1f} minutes ago")
    print(f"  Rating: {most_recent_fb.get('rating')}")

    if age_minutes_fb < 60:
        print(f"  ✅ Fresh feedback (< 1 hour)")
    elif age_minutes_fb < 1440:
        print(f"  ⚠️  Feedback is {age_minutes_fb/60:.1f} hours old")

# 4. VALIDATE DASHBOARD READINESS
print_section("4. DASHBOARD READINESS CHECK")

issues = []

# Check evaluations
if len(evals.data) == 0:
    issues.append("❌ No evaluations in last 24 hours - dashboard will be empty")
else:
    print(f"✅ Evaluations: {len(evals.data)} records")

# Check required fields
if evals.data:
    sample = evals.data[0]
    if not sample.get('overall_confidence'):
        issues.append("❌ Missing overall_confidence scores")
    if not sample.get('confidence_level'):
        issues.append("❌ Missing confidence_level labels")
    if not sample.get('source'):
        issues.append("⚠️  Missing source field (defaults to 'unknown')")
    if not sample.get('total_latency_ms'):
        issues.append("⚠️  Missing latency metrics")

    if not issues or all('⚠️' in i for i in issues):
        print(f"✅ All critical fields populated")

# Check feedback
if len(feedback.data) > 0:
    print(f"✅ User feedback: {len(feedback.data)} entries")
else:
    print(f"ℹ️  No user feedback yet (this is optional)")

# Check penalty-based scoring (scores should match thresholds)
if evals.data:
    mismatches = 0
    for e in evals.data:
        score = e.get('overall_confidence', 0)
        level = e.get('confidence_level', '')

        expected = 'high' if score >= 8.0 else ('medium' if score >= 6.0 else 'low')
        if level != expected:
            mismatches += 1

    match_rate = (len(evals.data) - mismatches) / len(evals.data) * 100

    if match_rate >= 90:
        print(f"✅ Penalty-based scoring: {match_rate:.1f}% match rate")
    else:
        issues.append(f"⚠️  Only {match_rate:.1f}% of scores match penalty thresholds")

# Final summary
print_section("VALIDATION SUMMARY")

if not issues:
    print("✅ ALL CHECKS PASSED")
    print("\nDashboard is fully operational with:")
    print(f"  - {len(evals.data)} evaluations in last 24h")
    print(f"  - {len(feedback.data)} user feedback entries")
    print(f"  - Complete field population")
    print(f"  - Penalty-based scoring active")
    print(f"\nDashboard URL: /response-quality-dashboard")
else:
    print("ISSUES FOUND:")
    for issue in issues:
        print(f"  {issue}")

    print(f"\nNon-critical issues: {sum(1 for i in issues if '⚠️' in i)}")
    print(f"Critical issues: {sum(1 for i in issues if '❌' in i)}")

print(f"\nValidation completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
