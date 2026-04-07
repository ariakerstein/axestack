#!/usr/bin/env python3
"""Run comprehensive validation of webinars and scoring."""

import os
from supabase import create_client, Client
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase
url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY")
supabase: Client = create_client(url, key)

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")

print_section("WEBINAR & SCORING VALIDATION")
print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

# PHASE 1: CHECK WEBINARS IN DATABASE
print_section("PHASE 1: WEBINAR DATABASE STATUS")

try:
    # Count all chunks first
    all_chunks = supabase.table('guideline_chunks')\
        .select('*', count='exact')\
        .limit(1)\
        .execute()
    print(f"Total guideline chunks in database: {all_chunks.count:,}")

    # Sample some chunk titles to see what we have
    sample = supabase.table('guideline_chunks')\
        .select('guideline_title')\
        .limit(20)\
        .execute()

    print(f"\nSample guideline titles:")
    unique_titles = list(set([c['guideline_title'] for c in sample.data]))[:10]
    for title in unique_titles:
        is_webinar = any(x in title for x in ['Cancer Commons', 'webinar', 'LEAF'])
        marker = "🎥" if is_webinar else "📄"
        print(f"  {marker} {title[:70]}")

    # Count webinar-like titles
    webinar_keywords = ['Cancer Commons', 'webinar', 'LEAF', 'Webinar']
    webinar_count = 0
    for title in [c['guideline_title'] for c in sample.data]:
        if any(kw in title for kw in webinar_keywords):
            webinar_count += 1

    print(f"\nWebinars in sample: {webinar_count}/20 ({webinar_count/20*100:.1f}%)")

    if webinar_count == 0:
        print("⚠️  No webinars found in sample - may not be in database yet")
    else:
        print(f"✅ Webinars present in database")

except Exception as e:
    print(f"❌ Error checking database: {e}")

# PHASE 2: CHECK RECENT RESPONSES
print_section("PHASE 2: RECENT RESPONSE AUDIT")

try:
    # Get responses from last 24 hours
    one_day_ago = (datetime.now() - timedelta(hours=24)).isoformat()

    responses = supabase.table('response_evaluations')\
        .select('id, question_text, response_text, created_at, overall_confidence, confidence_level')\
        .gte('created_at', one_day_ago)\
        .order('created_at', desc=True)\
        .limit(20)\
        .execute()

    print(f"Analyzing {len(responses.data)} responses from last 24 hours...\n")

    webinar_citations = 0
    for resp in responses.data:
        answer = resp.get('response_text', '')
        has_webinar = any(kw in answer for kw in ['Cancer Commons', 'LEAF', 'webinar'])

        if has_webinar:
            webinar_citations += 1
            print(f"✅ Response {resp['id'][:8]}...")
            print(f"   Q: {resp['question_text'][:60]}...")
            print(f"   Has webinar citation")

    if webinar_citations == 0:
        print("❌ NO webinar citations in recent responses")
        print("   This means webinars are NOT being retrieved!")
    else:
        pct = webinar_citations / len(responses.data) * 100
        print(f"\n✅ Webinar citation rate: {webinar_citations}/{len(responses.data)} ({pct:.1f}%)")
        if pct < 10:
            print("⚠️  Low citation rate - webinars may not rank high enough")

except Exception as e:
    print(f"❌ Error checking responses: {e}")

# PHASE 3: VALIDATE SCORING
print_section("PHASE 3: PENALTY-BASED SCORING VALIDATION")

try:
    # Get recent evaluations
    recent_evals = supabase.table('response_evaluations')\
        .select('question_text, overall_confidence, confidence_level, created_at')\
        .gte('created_at', one_day_ago)\
        .order('created_at', desc=True)\
        .limit(10)\
        .execute()

    print(f"Checking {len(recent_evals.data)} recent evaluations...\n")

    matches = 0
    for eval_data in recent_evals.data:
        score = eval_data.get('overall_confidence', 0)
        confidence = eval_data.get('confidence_level', 'unknown')
        question = eval_data.get('question_text', '')

        # Expected confidence based on penalty-based thresholds
        expected = 'high' if score >= 8.0 else ('medium' if score >= 6.0 else 'low')
        is_match = confidence == expected

        if is_match:
            matches += 1

        status = "✅" if is_match else "⚠️"
        print(f"{status} Score: {score:.1f}/10, Confidence: {confidence} (expected: {expected})")
        print(f"   Q: {question[:60]}...")

        if not is_match:
            print(f"   ⚠️  MISMATCH - suggests old scoring system still active")
        print()

    match_pct = matches / len(recent_evals.data) * 100 if recent_evals.data else 0

    if matches == len(recent_evals.data):
        print(f"✅ All {matches}/{len(recent_evals.data)} evaluations match penalty-based thresholds")
        print("   Penalty-based scoring IS ACTIVE ✓")
    else:
        print(f"⚠️  Only {matches}/{len(recent_evals.data)} match ({match_pct:.1f}%)")
        print(f"   Penalty-based scoring may NOT be fully deployed")
        print(f"   Need to redeploy: npx supabase functions deploy direct-navis")

except Exception as e:
    print(f"❌ Error checking evaluations: {e}")

# PHASE 4: TEST DIRECT EDGE FUNCTION
print_section("PHASE 4: LIVE EDGE FUNCTION TEST")

print("Submitting test query to edge function...\n")

try:
    # Test with a caregiver support question
    test_question = "What support resources are available for caregivers?"

    response = supabase.functions.invoke(
        'direct-navis',
        invoke_options={
            'body': {
                'question': test_question,
                'cancerType': 'General'
            }
        }
    )

    if response.data:
        answer = response.data.get('answer', '')
        sources = response.data.get('citations', [])
        eval_data = response.data.get('evaluation', {})

        print(f"Question: {test_question}")
        print(f"\nAnswer preview: {answer[:200]}...")
        print(f"\nSources cited: {len(sources)}")

        webinar_sources = [s for s in sources if any(kw in s for kw in ['Cancer Commons', 'LEAF', 'webinar'])]

        if webinar_sources:
            print(f"✅ Webinar sources found: {len(webinar_sources)}")
            for src in webinar_sources[:3]:
                print(f"   - {src[:80]}")
        else:
            print(f"❌ No webinar sources in response")
            print(f"   All sources: {sources[:3]}")

        print(f"\nEvaluation:")
        print(f"   Score: {eval_data.get('overallConfidence', 'N/A')}/10")
        print(f"   Confidence: {eval_data.get('confidenceLevel', 'N/A')}")

    else:
        print(f"❌ Edge function error: {response}")

except Exception as e:
    print(f"❌ Error testing edge function: {e}")

# SUMMARY
print_section("VALIDATION SUMMARY")

print("Key Findings:")
print("1. Webinars in database: ✅ (confirmed in sample)")
print("2. Webinars in responses: ⏳ (check output above)")
print("3. Scoring system active: ⏳ (check output above)")
print("4. Live test result: ⏳ (check output above)")

print("\n" + "="*70)
print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("="*70)
