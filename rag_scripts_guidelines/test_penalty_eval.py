#!/usr/bin/env python3
"""
Test penalty-based evaluation system
Should show better discrimination between good and poor answers
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Test questions of varying quality expectations
TEST_CASES = [
    {
        'name': 'Perfect match (NCCN + webinar content)',
        'question': 'What is bipolar androgen therapy?',
        'cancer_type': 'Prostate',
        'expected': 'high (9-10)'
    },
    {
        'name': 'Good NCCN match',
        'question': 'What are the side effects of immunotherapy?',
        'cancer_type': 'Lung',
        'expected': 'high (8-9)'
    },
    {
        'name': 'Generic question (lower similarity expected)',
        'question': 'What is cancer?',
        'cancer_type': 'General',
        'expected': 'medium (6-7)'
    }
]

def test_question(test_case):
    """Test a single question"""
    edge_url = f"{SUPABASE_URL}/functions/v1/direct-navis"
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }

    print(f"\n{'='*80}")
    print(f"TEST: {test_case['name']}")
    print(f"{'='*80}")
    print(f"Question: {test_case['question']}")
    print(f"Cancer Type: {test_case['cancer_type']}")
    print(f"Expected: {test_case['expected']}\n")

    response = requests.post(
        edge_url,
        headers=headers,
        json={
            'question': test_case['question'],
            'cancerType': test_case['cancer_type']
        },
        timeout=120
    )

    if response.status_code != 200:
        print(f"❌ ERROR: {response.status_code}")
        print(response.text[:200])
        return

    data = response.json()

    # Extract key metrics
    search_method = data.get('searchMethod', 'unknown')
    chunks_used = data.get('chunksUsed', 0)
    top_similarity = data.get('retrievedChunks', [{}])[0].get('similarity', 0) if data.get('retrievedChunks') else 0

    eval_scores = data.get('evaluationScores', {})
    final_score = eval_scores.get('overallConfidence', 0)
    confidence = eval_scores.get('confidenceLevel', 'unknown')

    citations = data.get('citations', [])

    # Count source types
    citations_lower = [c.lower() for c in citations]
    nccn_count = sum(1 for c in citations_lower if 'nccn' in c)
    webinar_count = sum(1 for c in citations_lower if 'webinar' in c or 'leaf' in c)

    print("SEARCH PERFORMANCE:")
    print(f"  Method: {search_method}")
    print(f"  Chunks: {chunks_used}")
    print(f"  Top similarity: {top_similarity:.3f}")

    print(f"\nSOURCE QUALITY:")
    print(f"  Total citations: {len(citations)}")
    print(f"  NCCN sources: {nccn_count}")
    print(f"  Webinar sources: {webinar_count}")

    print(f"\nEVAL SCORE (PENALTY-BASED):")
    print(f"  Final Score: {final_score:.1f}/10")
    print(f"  Confidence: {confidence}")
    print(f"  Expected: {test_case['expected']}")

    # Determine if eval is working
    if confidence == 'high' and final_score >= 8.0:
        status = "✅ HIGH QUALITY"
    elif confidence == 'medium' and 6.0 <= final_score < 8.0:
        status = "⚠️  MEDIUM QUALITY"
    elif confidence == 'low' and final_score < 6.0:
        status = "❌ LOW QUALITY"
    else:
        status = f"? UNCLEAR ({final_score:.1f} → {confidence})"

    print(f"\n  Result: {status}")

    return {
        'name': test_case['name'],
        'score': final_score,
        'confidence': confidence,
        'chunks': chunks_used,
        'similarity': top_similarity,
        'nccn_sources': nccn_count,
        'webinar_sources': webinar_count
    }

print("\n" + "="*80)
print("PENALTY-BASED EVALUATION TEST")
print("="*80)
print("\nTesting new eval system for score discrimination\n")

results = []
for test_case in TEST_CASES:
    result = test_question(test_case)
    if result:
        results.append(result)

print("\n" + "="*80)
print("SUMMARY - Score Discrimination Check")
print("="*80 + "\n")

if results:
    scores = [r['score'] for r in results]
    confidences = [r['confidence'] for r in results]

    print("Score Range:")
    print(f"  Min: {min(scores):.1f}")
    print(f"  Max: {max(scores):.1f}")
    print(f"  Range: {max(scores) - min(scores):.1f}")

    print(f"\nConfidence Distribution:")
    for level in ['high', 'medium', 'low']:
        count = confidences.count(level)
        print(f"  {level}: {count}/{len(results)}")

    # Check if discrimination is working
    unique_confidences = len(set(confidences))
    score_range = max(scores) - min(scores)

    print("\n" + "="*80)
    if unique_confidences > 1 and score_range > 1.5:
        print("✅ EVAL DISCRIMINATION: WORKING!")
        print(f"   - {unique_confidences} different confidence levels")
        print(f"   - {score_range:.1f} point score range")
    elif unique_confidences == 1:
        print("❌ EVAL DISCRIMINATION: NOT WORKING")
        print(f"   - All scores show '{confidences[0]}'")
        print("   - No differentiation between quality levels")
    else:
        print("⚠️  EVAL DISCRIMINATION: WEAK")
        print(f"   - Only {score_range:.1f} point range")
        print("   - May need adjustment")

    print("="*80 + "\n")
