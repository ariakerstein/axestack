#!/usr/bin/env python3
"""Final validation - webinars and scoring."""

import os
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime, timedelta
import json

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")

print_section("COMPREHENSIVE VALIDATION - WEBINARS & SCORING")
print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

# 1. CHECK DATABASE - WEBINARS
print_section("1. DATABASE - WEBINAR COUNT")

# First, get one record to see schema
sample = supabase.table('guideline_chunks').select('*').limit(1).execute()
if sample.data:
    print(f"Database columns: {', '.join(sample.data[0].keys())}\n")

# Count total chunks
total_result = supabase.table('guideline_chunks').select('*', count='exact').limit(1).execute()
print(f"Total guideline chunks: {total_result.count:,}")

# Sample chunk titles
titles_result = supabase.table('guideline_chunks').select('guideline_title').limit(50).execute()
all_titles = [c['guideline_title'] for c in titles_result.data]
unique_titles = list(set(all_titles))

webinar_titles = [t for t in unique_titles if t and any(kw in t for kw in ['Cancer Commons', 'LEAF', 'webinar', 'Webinar'])]
nccn_titles = [t for t in unique_titles if t and 'NCCN' in t]

print(f"Unique NCCN guidelines: {len(nccn_titles)}")
print(f"Unique webinar titles: {len(webinar_titles)}")

if webinar_titles:
    print(f"\nSample webinar titles:")
    for title in webinar_titles[:5]:
        print(f"  🎥 {title[:70]}")

# 2. CHECK RECENT RESPONSES
print_section("2. RESPONSE AUDIT - WEBINAR CITATIONS")

one_day_ago = (datetime.now() - timedelta(days=1)).isoformat()

# Get schema first
resp_sample = supabase.table('response_evaluations').select('*').limit(1).execute()
if resp_sample.data:
    print(f"Response evaluation columns: {', '.join(resp_sample.data[0].keys())}\n")

# Get recent responses
responses = supabase.table('response_evaluations')\
    .select('*')\
    .gte('created_at', one_day_ago)\
    .order('created_at', desc=True)\
    .limit(20)\
    .execute()

print(f"Analyzing {len(responses.data)} responses from last 24 hours...\n")

webinar_count = 0
for resp in responses.data:
    # Check which field contains the answer text
    answer = resp.get('answer', '') or resp.get('response_text', '') or resp.get('response', '')

    if any(kw in answer for kw in ['Cancer Commons', 'LEAF', 'webinar']):
        webinar_count += 1
        question = resp.get('question', '') or resp.get('query', '') or 'N/A'
        print(f"✅ Response {resp['id'][:8]}... has webinar citation")
        print(f"   Q: {question[:60]}...")

if webinar_count == 0:
    print(f"❌ NO webinar citations found in {len(responses.data)} recent responses")
    print(f"   Webinars exist in DB but are NOT being retrieved!")
else:
    pct = webinar_count / len(responses.data) * 100
    print(f"\n✅ Webinar citations: {webinar_count}/{len(responses.data)} ({pct:.1f}%)")

# 3. VALIDATE SCORING
print_section("3. SCORING VALIDATION")

print(f"Checking {len(responses.data)} recent evaluations against penalty-based thresholds...\n")

matches = 0
for resp in responses.data:
    score = resp.get('overall_confidence', 0) or resp.get('score', 0)
    confidence = resp.get('confidence_level', '') or resp.get('confidence', '')
    question = resp.get('question', '') or resp.get('query', '') or 'N/A'

    # Expected based on penalty thresholds
    expected = 'high' if score >= 8.0 else ('medium' if score >= 6.0 else 'low')
    is_match = confidence == expected

    if is_match:
        matches += 1

    status = "✅" if is_match else "⚠️"
    print(f"{status} Score: {score:.1f}/10, Confidence: {confidence} (expected: {expected})")
    print(f"   Q: {question[:60]}...")
    if not is_match:
        print(f"   ⚠️  MISMATCH!")
    print()

match_pct = matches / len(responses.data) * 100 if responses.data else 0

if matches == len(responses.data):
    print(f"✅ All {matches}/{len(responses.data)} match penalty-based thresholds")
    print(f"   Penalty-based scoring IS ACTIVE")
else:
    print(f"⚠️  Only {matches}/{len(responses.data)} match ({match_pct:.1f}%)")
    print(f"   Penalty-based scoring may NOT be deployed")

# SUMMARY
print_section("VALIDATION SUMMARY")

print("Results:")
print(f"  Total chunks in database: {total_result.count:,}")
print(f"  Webinar titles found: {len(webinar_titles)}")
print(f"  Webinar citations (24h): {webinar_count}/{len(responses.data)} ({webinar_count/len(responses.data)*100:.1f}%)")
print(f"  Scoring matches: {matches}/{len(responses.data)} ({match_pct:.1f}%)")

print("\nISSUES:")
if webinar_count == 0:
    print("  ❌ Webinars NOT appearing in responses - search ranking issue")
    print("     → Need to increase General boost or add webinar-specific boost")

if match_pct < 90:
    print("  ❌ Penalty-based scoring NOT fully active")
    print("     → Need to redeploy edge function")

if webinar_count > 0 and match_pct >= 90:
    print("  ✅ All systems working!")

# Save report
report = {
    'timestamp': datetime.now().isoformat(),
    'database': {
        'total_chunks': total_result.count,
        'webinar_titles': len(webinar_titles),
        'nccn_titles': len(nccn_titles)
    },
    'responses': {
        'total_checked': len(responses.data),
        'webinar_citations': webinar_count,
        'webinar_percentage': webinar_count/len(responses.data)*100 if responses.data else 0
    },
    'scoring': {
        'matches': matches,
        'total': len(responses.data),
        'percentage': match_pct
    }
}

filename = f"validation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
with open(filename, 'w') as f:
    json.dump(report, f, indent=2)

print(f"\nReport saved: {filename}")
print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
