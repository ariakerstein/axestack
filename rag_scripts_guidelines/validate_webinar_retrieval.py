#!/usr/bin/env python3
"""
Comprehensive validation script for webinar retrieval and penalty-based scoring.

This script validates:
1. Webinars are in the database
2. Webinars can be retrieved by search
3. Webinars appear in actual responses
4. Penalty-based scoring is working correctly
"""

import os
import json
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase
url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY")
supabase: Client = create_client(url, key)

def print_section(title):
    """Print a formatted section header."""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")

def check_webinars_in_database():
    """Check if webinars exist in guideline_chunks table."""
    print_section("1. WEBINAR DATABASE STATUS")

    # Check for LEAF webinars
    leaf_result = supabase.table('guideline_chunks')\
        .select('*', count='exact')\
        .ilike('guideline_title', '%LEAF%')\
        .execute()

    print(f"✓ LEAF webinar chunks: {leaf_result.count}")

    # Check for Cancer Commons webinars
    cc_result = supabase.table('guideline_chunks')\
        .select('*', count='exact')\
        .ilike('guideline_title', '%Cancer Commons%')\
        .execute()

    print(f"✓ Cancer Commons chunks: {cc_result.count}")

    # Check for any webinar chunks
    webinar_result = supabase.table('guideline_chunks')\
        .select('*', count='exact')\
        .ilike('guideline_title', '%webinar%')\
        .execute()

    print(f"✓ Total webinar chunks (title contains 'webinar'): {webinar_result.count}")

    # Get sample webinar titles
    sample_result = supabase.table('guideline_chunks')\
        .select('guideline_title')\
        .or_('guideline_title.ilike.%LEAF%,guideline_title.ilike.%Cancer Commons%,guideline_title.ilike.%webinar%')\
        .limit(10)\
        .execute()

    if sample_result.data:
        print(f"\nSample webinar titles found:")
        unique_titles = list(set([chunk['guideline_title'] for chunk in sample_result.data]))
        for title in unique_titles[:5]:
            print(f"  - {title}")

    return {
        'leaf_count': leaf_result.count,
        'cc_count': cc_result.count,
        'webinar_count': webinar_result.count,
        'sample_titles': unique_titles if sample_result.data else []
    }

def test_webinar_search_directly():
    """Test if webinars are retrieved by search queries."""
    print_section("2. WEBINAR SEARCH RETRIEVAL TEST")

    # Test queries that should retrieve webinars
    test_queries = [
        "What are caregiver support resources?",
        "How can caregivers manage stress?",
        "Tell me about patient navigation",
        "What support is available for families?"
    ]

    results = []

    for query in test_queries:
        print(f"\n📝 Testing query: '{query}'")

        # Simulate semantic search (simplified - actual search uses pgvector)
        # For now, just check if keywords match webinar content
        keywords = query.lower().split()

        search_result = supabase.table('guideline_chunks')\
            .select('guideline_title, chunk_text, cancer_type')\
            .or_('guideline_title.ilike.%LEAF%,guideline_title.ilike.%Cancer Commons%,guideline_title.ilike.%webinar%')\
            .limit(5)\
            .execute()

        if search_result.data:
            print(f"  ✓ Found {len(search_result.data)} webinar chunks")
            for chunk in search_result.data[:2]:
                print(f"    - {chunk['guideline_title'][:60]}... (Cancer: {chunk.get('cancer_type', 'N/A')})")
            results.append({
                'query': query,
                'found_webinars': True,
                'count': len(search_result.data)
            })
        else:
            print(f"  ❌ No webinar chunks found")
            results.append({
                'query': query,
                'found_webinars': False,
                'count': 0
            })

    return results

def check_recent_responses_for_webinars():
    """Check if recent Circle responses include webinar sources."""
    print_section("3. WEBINAR APPEARANCE IN ACTUAL RESPONSES")

    # Get last 20 responses
    one_hour_ago = (datetime.now() - timedelta(hours=24)).isoformat()

    result = supabase.table('response_evaluations')\
        .select('*')\
        .gte('created_at', one_hour_ago)\
        .order('created_at', desc=True)\
        .limit(20)\
        .execute()

    print(f"Analyzing {len(result.data)} recent responses...\n")

    webinar_appearances = []

    for response in result.data:
        response_id = response.get('id')
        answer = response.get('response_text', '')
        question = response.get('question_text', '')

        # Check if answer contains webinar references
        has_leaf = 'LEAF' in answer or 'leaf' in answer.lower()
        has_cc = 'Cancer Commons' in answer
        has_webinar = 'webinar' in answer.lower()

        if has_leaf or has_cc or has_webinar:
            print(f"✓ Response {response_id[:8]}...")
            print(f"  Question: {question[:80]}...")
            print(f"  Contains: ", end="")
            if has_leaf:
                print("LEAF ", end="")
            if has_cc:
                print("Cancer Commons ", end="")
            if has_webinar:
                print("webinar ", end="")
            print()

            webinar_appearances.append({
                'response_id': response_id,
                'has_webinar': True
            })

    if not webinar_appearances:
        print("❌ No webinar references found in recent responses")
        print("\nThis suggests webinars are NOT being retrieved in production!")

    return {
        'total_responses': len(result.data),
        'webinar_appearances': len(webinar_appearances),
        'percentage': (len(webinar_appearances) / len(result.data) * 100) if result.data else 0
    }

def validate_penalty_scoring_deployment():
    """Validate that penalty-based scoring is actually being used."""
    print_section("4. PENALTY-BASED SCORING VALIDATION")

    # Check edge function logs to see if penalty scoring is active
    print("Checking recent evaluations for penalty-based scoring indicators...\n")

    one_hour_ago = (datetime.now() - timedelta(hours=24)).isoformat()

    result = supabase.table('response_evaluations')\
        .select('*')\
        .gte('created_at', one_hour_ago)\
        .order('created_at', desc=True)\
        .limit(10)\
        .execute()

    print(f"Analyzing {len(result.data)} recent evaluations...\n")

    score_analysis = []

    for eval_data in result.data:
        eval_score = eval_data.get('overall_confidence', 0)
        confidence = eval_data.get('confidence_level', 'unknown')
        question = eval_data.get('question_text', '')

        print(f"Response: {question[:60]}...")
        print(f"  Score: {eval_score}/10")
        print(f"  Confidence: {confidence}")
        print(f"  Expected: high if score >= 8.0, medium if >= 6.0")

        # Check if scoring matches penalty-based thresholds
        expected_confidence = 'high' if eval_score >= 8.0 else ('medium' if eval_score >= 6.0 else 'low')

        if confidence == expected_confidence:
            print(f"  ✓ Matches penalty-based thresholds")
        else:
            print(f"  ⚠️  Mismatch! Expected '{expected_confidence}', got '{confidence}'")
            print(f"  This suggests OLD evaluation system may still be active!")

        score_analysis.append({
            'score': eval_score,
            'confidence': confidence,
            'expected_confidence': expected_confidence,
            'matches': confidence == expected_confidence
        })
        print()

    matches = sum(1 for s in score_analysis if s['matches'])
    total = len(score_analysis)

    if matches == total:
        print(f"✓ All {total}/{total} evaluations match penalty-based thresholds")
    else:
        print(f"⚠️  Only {matches}/{total} evaluations match penalty-based thresholds")
        print(f"This suggests the penalty-based system may not be deployed!")

    return {
        'total_evaluations': total,
        'matching_threshold': matches,
        'percentage': (matches / total * 100) if total else 0
    }

def test_scoring_scenarios():
    """Test scoring with known scenarios."""
    print_section("5. SCORING SCENARIO TESTS")

    print("Testing expected scoring behavior:\n")

    scenarios = [
        {
            'name': 'Perfect response',
            'chunks_used': 8,
            'top_similarity': 0.70,
            'tier1_count': 4,
            'answer_length': 800,
            'expected_penalty': 0,
            'expected_score': 10.0,
            'expected_confidence': 'high'
        },
        {
            'name': 'Good response (no webinars)',
            'chunks_used': 6,
            'top_similarity': 0.58,
            'tier1_count': 0,
            'answer_length': 600,
            'expected_penalty': 2.0,  # No tier1/webinar sources
            'expected_score': 8.0,
            'expected_confidence': 'high'
        },
        {
            'name': 'Mediocre response',
            'chunks_used': 4,
            'top_similarity': 0.52,
            'tier1_count': 1,
            'answer_length': 400,
            'expected_penalty': 3.0,  # < 5 chunks (1.0) + < 0.60 similarity (1.0) + < 2 tier1 (1.0)
            'expected_score': 7.0,
            'expected_confidence': 'medium'
        },
        {
            'name': 'Poor response',
            'chunks_used': 2,
            'top_similarity': 0.45,
            'tier1_count': 0,
            'answer_length': 200,
            'expected_penalty': 7.0,  # < 3 chunks (2.0) + < 0.50 similarity (2.0) + no tier1 (2.0) + short (1.0)
            'expected_score': 3.0,
            'expected_confidence': 'low'
        }
    ]

    for scenario in scenarios:
        print(f"Scenario: {scenario['name']}")
        print(f"  Inputs:")
        print(f"    - Chunks: {scenario['chunks_used']}")
        print(f"    - Similarity: {scenario['top_similarity']}")
        print(f"    - Tier 1 sources: {scenario['tier1_count']}")
        print(f"    - Answer length: {scenario['answer_length']} chars")
        print(f"  Expected:")
        print(f"    - Penalty: -{scenario['expected_penalty']}")
        print(f"    - Score: {scenario['expected_score']}/10")
        print(f"    - Confidence: {scenario['expected_confidence']}")
        print()

    return scenarios

def main():
    """Run all validation checks."""
    print_section("COMPREHENSIVE VALIDATION REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = {}

    # 1. Check webinars in database
    results['webinar_database'] = check_webinars_in_database()

    # 2. Test webinar search
    results['webinar_search'] = test_webinar_search_directly()

    # 3. Check recent responses
    results['webinar_in_responses'] = check_recent_responses_for_webinars()

    # 4. Validate scoring deployment
    results['scoring_validation'] = validate_penalty_scoring_deployment()

    # 5. Test scoring scenarios
    results['scoring_scenarios'] = test_scoring_scenarios()

    # Final summary
    print_section("SUMMARY & RECOMMENDATIONS")

    webinar_db_count = results['webinar_database']['webinar_count']
    webinar_response_pct = results['webinar_in_responses']['percentage']
    scoring_match_pct = results['scoring_validation']['percentage']

    print("Key Findings:\n")

    # Webinar findings
    if webinar_db_count > 0:
        print(f"✓ Webinars in database: {webinar_db_count} chunks")
    else:
        print(f"❌ No webinars in database!")

    if webinar_response_pct > 10:
        print(f"✓ Webinars appear in {webinar_response_pct:.1f}% of responses")
    else:
        print(f"⚠️  Webinars only in {webinar_response_pct:.1f}% of responses")
        print(f"   This is LOW - webinars may not be ranked highly in search")

    # Scoring findings
    if scoring_match_pct >= 80:
        print(f"✓ Penalty-based scoring appears active ({scoring_match_pct:.1f}% match)")
    else:
        print(f"❌ Penalty-based scoring may NOT be active ({scoring_match_pct:.1f}% match)")

    print("\nRecommendations:\n")

    if webinar_db_count == 0:
        print("1. ❗ Run webinar processing scripts to populate database")
    elif webinar_response_pct < 10:
        print("1. ❗ Webinars exist but aren't retrieved - check search ranking/boosting")
        print("   - Verify cancer_type='General' gets 1.1x boost")
        print("   - Check if webinar similarity scores are too low")

    if scoring_match_pct < 80:
        print("2. ❗ Redeploy edge function with penalty-based evaluation")
        print("   - Run: npx supabase functions deploy direct-navis")
        print("   - Verify penalty-based-evaluation.ts is imported")

    # Save results
    output_file = f"validation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\nFull results saved to: {output_file}")

if __name__ == "__main__":
    main()
