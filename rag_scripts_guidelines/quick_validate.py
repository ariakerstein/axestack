#!/usr/bin/env python3
"""Quick validation of webinars in database and scoring system."""

import os
import psycopg2
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Get database URL
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not set in environment")
    exit(1)

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")

# Connect to database
conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# 1. CHECK WEBINARS IN DATABASE
print_section("1. WEBINAR STATUS IN DATABASE")

cursor.execute("""
    SELECT COUNT(*)
    FROM guideline_chunks
    WHERE guideline_title ILIKE '%Cancer Commons%'
       OR guideline_title ILIKE '%webinar%'
       OR guideline_title ILIKE '%LEAF%'
""")
webinar_count = cursor.fetchone()[0]
print(f"✓ Total webinar chunks: {webinar_count:,}")

cursor.execute("""
    SELECT DISTINCT guideline_title
    FROM guideline_chunks
    WHERE guideline_title ILIKE '%Cancer Commons%'
       OR guideline_title ILIKE '%webinar%'
       OR guideline_title ILIKE '%LEAF%'
    LIMIT 10
""")
print(f"\nSample webinar titles:")
for row in cursor.fetchall():
    print(f"  - {row[0][:80]}...")

# 2. CHECK RECENT RESPONSES FOR WEBINAR CITATIONS
print_section("2. WEBINAR CITATIONS IN RECENT RESPONSES")

cursor.execute("""
    SELECT
        id,
        question_text,
        response_text,
        created_at
    FROM response_evaluations
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 20
""")

responses = cursor.fetchall()
print(f"Analyzing {len(responses)} responses from last 24 hours...\n")

webinar_found = 0
for response_id, question, answer, created_at in responses:
    has_webinar = (
        'Cancer Commons' in answer or
        'LEAF' in answer or
        'webinar' in answer.lower()
    )

    if has_webinar:
        webinar_found += 1
        print(f"✓ Response {response_id[:8]}... ({created_at})")
        print(f"  Question: {question[:60]}...")
        print(f"  Contains webinar citation")
        print()

if webinar_found == 0:
    print("❌ NO webinar citations found in recent responses!")
    print("   This suggests webinars are NOT being retrieved in search")
else:
    print(f"✓ Found webinar citations in {webinar_found}/{len(responses)} responses ({webinar_found/len(responses)*100:.1f}%)")

# 3. CHECK PENALTY-BASED SCORING
print_section("3. PENALTY-BASED SCORING VALIDATION")

cursor.execute("""
    SELECT
        question_text,
        overall_confidence,
        confidence_level,
        created_at
    FROM response_evaluations
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 10
""")

evaluations = cursor.fetchall()
print(f"Checking {len(evaluations)} recent evaluations...\n")

matches = 0
for question, score, confidence, created_at in evaluations:
    # Expected confidence based on penalty-based thresholds
    expected = 'high' if score >= 8.0 else ('medium' if score >= 6.0 else 'low')
    is_match = confidence == expected

    if is_match:
        matches += 1

    status = "✓" if is_match else "⚠️"
    print(f"{status} Q: {question[:50]}...")
    print(f"   Score: {score:.1f}/10, Confidence: {confidence} (expected: {expected})")
    if not is_match:
        print(f"   ⚠️  MISMATCH - suggests old scoring system")
    print()

if matches == len(evaluations):
    print(f"✅ All {matches}/{len(evaluations)} evaluations match penalty-based thresholds")
    print("   Penalty-based scoring IS ACTIVE")
else:
    print(f"⚠️  Only {matches}/{len(evaluations)} match penalty-based thresholds ({matches/len(evaluations)*100:.1f}%)")
    print(f"   This suggests penalty-based scoring may NOT be fully deployed")

# 4. TEST DIRECT WEBINAR SEARCH
print_section("4. DIRECT WEBINAR SEARCH TEST")

test_query = "caregiver support"
print(f"Testing search for: '{test_query}'\n")

cursor.execute("""
    SELECT
        guideline_title,
        chunk_text,
        cancer_type
    FROM guideline_chunks
    WHERE (guideline_title ILIKE %s OR chunk_text ILIKE %s)
      AND (guideline_title ILIKE '%%Cancer Commons%%'
           OR guideline_title ILIKE '%%webinar%%'
           OR guideline_title ILIKE '%%LEAF%%')
    LIMIT 5
""", (f'%{test_query}%', f'%{test_query}%'))

results = cursor.fetchall()
if results:
    print(f"✓ Found {len(results)} webinar chunks matching '{test_query}'")
    for title, text, cancer_type in results:
        print(f"  - {title[:60]}... ({cancer_type or 'General'})")
        print(f"    {text[:100]}...")
        print()
else:
    print(f"❌ No webinar chunks found for '{test_query}'")

# SUMMARY
print_section("SUMMARY & RECOMMENDATIONS")

print(f"Webinars in database: {webinar_count:,} chunks ✓" if webinar_count > 0 else "❌ No webinars found")
print(f"Webinar citations in responses: {webinar_found}/{len(responses)} ({webinar_found/len(responses)*100:.1f}%)")
print(f"Scoring system match: {matches}/{len(evaluations)} ({matches/len(evaluations)*100:.1f}%)")

print("\nISSUES DETECTED:\n")

if webinar_count == 0:
    print("❗ No webinars in database - run webinar processing")
elif webinar_found == 0:
    print("❗ Webinars exist but NOT appearing in responses")
    print("   → Check search ranking/boosting logic")
    print("   → Verify cancer_type='General' gets proper boost")
    print("   → Test hybrid search function directly")

if matches < len(evaluations):
    print("❗ Penalty-based scoring not fully active")
    print("   → Redeploy edge function: npx supabase functions deploy direct-navis")
    print("   → Check penalty-based-evaluation.ts is imported")

if webinar_count > 0 and webinar_found > 0 and matches == len(evaluations):
    print("✅ All systems operational!")

conn.close()
