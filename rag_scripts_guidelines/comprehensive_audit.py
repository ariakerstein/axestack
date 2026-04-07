#!/usr/bin/env python3
"""
Comprehensive Audit: Latency + Eval Scores + Response Quality
Tests the RAG pipeline and audits all dimensions
"""

import os
import time
import json
from dotenv import load_dotenv
import requests
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

print("\n" + "="*70)
print("COMPREHENSIVE RAG AUDIT")
print("="*70 + "\n")

# Step 1: Verify match_chunks function exists
print("Step 1: Checking if match_chunks SQL function exists...")
try:
    # Try to call the function
    test_embedding = [0.1] * 1536
    result = supabase.rpc('match_chunks', {
        'query_embedding': test_embedding,
        'match_threshold': 0.5,
        'match_count': 1,
        'cancer_type_filter': 'Brain'
    }).execute()

    print("  ✓ match_chunks function EXISTS")
    print(f"  ✓ Test query returned {len(result.data)} results")
    function_exists = True
except Exception as e:
    print(f"  ✗ match_chunks function MISSING")
    print(f"  Error: {str(e)[:100]}")
    function_exists = False

print("\n" + "="*70)

# Step 2: Test 3 questions with detailed metrics
test_questions = [
    {
        'question': 'What is bipolar androgen therapy?',
        'cancerType': 'Prostate',
        'expected_keywords': ['testosterone', 'androgen', 'therapy', 'prostate']
    },
    {
        'question': 'What are treatment options for glioblastoma?',
        'cancerType': 'Brain',
        'expected_keywords': ['radiation', 'chemotherapy', 'surgery', 'temozolomide']
    },
    {
        'question': 'What are side effects of immunotherapy?',
        'cancerType': 'General',
        'expected_keywords': ['immune', 'fatigue', 'inflammation', 'reaction']
    }
]

edge_url = f"{SUPABASE_URL}/functions/v1/direct-navis"
headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

results = []

print("\nStep 2: Testing questions with detailed metrics...\n")

for i, test in enumerate(test_questions, 1):
    print(f"[{i}/3] Testing: {test['question'][:60]}...")

    start_time = time.time()

    try:
        response = requests.post(
            edge_url,
            headers=headers,
            json={
                'question': test['question'],
                'cancerType': test['cancerType'],
                'directMode': False,
                'model': 'claude-3-5-sonnet'
            },
            timeout=120
        )

        end_time = time.time()
        total_latency = end_time - start_time

        if response.status_code == 200:
            data = response.json()

            # Extract metrics
            search_method = data.get('searchMethod', 'unknown')
            chunks_used = data.get('chunksUsed', 0)
            answer = data.get('answer', '')
            search_latency = data.get('searchLatencyMs', 0)
            llm_latency = data.get('llmLatencyMs', 0)
            total_api_latency = data.get('totalLatencyMs', 0)

            # Check for expected keywords
            answer_lower = answer.lower()
            keywords_found = sum(1 for kw in test['expected_keywords'] if kw.lower() in answer_lower)
            keyword_match_pct = (keywords_found / len(test['expected_keywords'])) * 100

            # Eval scores (if available)
            eval_scores = data.get('evaluationScores', {})

            result = {
                'question': test['question'],
                'cancer_type': test['cancerType'],
                'status': 'success',
                'total_latency_s': round(total_latency, 2),
                'search_method': search_method,
                'chunks_used': chunks_used,
                'search_latency_ms': search_latency,
                'llm_latency_ms': llm_latency,
                'total_api_latency_ms': total_api_latency,
                'answer_length': len(answer),
                'keyword_match_pct': round(keyword_match_pct, 1),
                'keywords_found': f"{keywords_found}/{len(test['expected_keywords'])}",
                'eval_scores': eval_scores
            }

            print(f"  ✓ Success in {total_latency:.1f}s")
            print(f"    Search: {search_method} | Chunks: {chunks_used}")
            print(f"    Keyword match: {keyword_match_pct:.0f}% ({keywords_found}/{len(test['expected_keywords'])})")

        else:
            result = {
                'question': test['question'],
                'status': 'failed',
                'error': f"HTTP {response.status_code}",
                'total_latency_s': round(total_latency, 2)
            }
            print(f"  ✗ Failed: HTTP {response.status_code}")

    except Exception as e:
        end_time = time.time()
        total_latency = end_time - start_time
        result = {
            'question': test['question'],
            'status': 'error',
            'error': str(e)[:100],
            'total_latency_s': round(total_latency, 2)
        }
        print(f"  ✗ Error: {str(e)[:60]}")

    results.append(result)
    print()

# Step 3: Analysis
print("="*70)
print("AUDIT RESULTS")
print("="*70 + "\n")

successful = [r for r in results if r.get('status') == 'success']

if successful:
    avg_latency = sum(r['total_latency_s'] for r in successful) / len(successful)
    avg_chunks = sum(r.get('chunks_used', 0) for r in successful) / len(successful)
    avg_keyword_match = sum(r.get('keyword_match_pct', 0) for r in successful) / len(successful)

    search_methods = [r.get('search_method', 'unknown') for r in successful]
    using_semantic = 'semantic' in ' '.join(search_methods).lower()
    using_chunks = avg_chunks > 0

    print(f"Success Rate: {len(successful)}/{len(results)} ({len(successful)/len(results)*100:.0f}%)\n")

    print("LATENCY:")
    print(f"  Average total latency: {avg_latency:.2f}s")
    for r in successful:
        print(f"    - {r['question'][:50]}: {r['total_latency_s']:.2f}s")

    print(f"\nSEARCH PERFORMANCE:")
    print(f"  Average chunks used: {avg_chunks:.1f}")
    print(f"  Search methods: {', '.join(set(search_methods))}")
    print(f"  Using semantic search: {'✓ YES' if using_semantic else '✗ NO'}")
    print(f"  Using guideline chunks: {'✓ YES' if using_chunks else '✗ NO (PROBLEM!)'}")

    print(f"\nQUALITY:")
    print(f"  Average keyword match: {avg_keyword_match:.1f}%")

    print(f"\nEVAL SCORES:")
    has_eval_scores = any(r.get('eval_scores') for r in successful)
    if has_eval_scores:
        for r in successful:
            scores = r.get('eval_scores', {})
            if scores:
                print(f"  {r['question'][:40]}:")
                for metric, value in scores.items():
                    print(f"    - {metric}: {value}")
    else:
        print("  ⚠️  No eval scores returned (might not be implemented)")

    # Diagnosis
    print("\n" + "="*70)
    print("DIAGNOSIS")
    print("="*70)

    if not function_exists:
        print("❌ CRITICAL: match_chunks SQL function MISSING")
        print("   → Paste SQL into Supabase dashboard immediately")
        print("   → https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new")

    if not using_chunks:
        print("❌ CRITICAL: No guideline chunks being used")
        print("   → Search is broken, Claude answering from general knowledge")
        print("   → This causes SLOW responses (20+ seconds)")

    if avg_latency > 15:
        print("⚠️  WARNING: High latency (>15s average)")
        if not using_chunks:
            print("   → Caused by: No chunks = full Claude generation from scratch")
        else:
            print("   → Caused by: Claude 4.5 is slow, consider Claude 3.5")
    elif avg_latency > 10:
        print("⚠️  Moderate latency (10-15s)")
    else:
        print("✓ Good latency (<10s)")

    if avg_keyword_match < 50:
        print("⚠️  WARNING: Low keyword match (<50%)")
        print("   → Answers may not be relevant to the question")
    elif avg_keyword_match < 75:
        print("⚠️  Moderate keyword match (50-75%)")
    else:
        print("✓ Good keyword match (>75%)")

else:
    print("❌ All tests failed - system is broken")

print("\n" + "="*70 + "\n")

# Save results
output_file = f'audit_results_{int(time.time())}.json'
with open(output_file, 'w') as f:
    json.dump({
        'function_exists': function_exists,
        'results': results,
        'summary': {
            'success_rate': len(successful) / len(results) if results else 0,
            'avg_latency': avg_latency if successful else None,
            'avg_chunks': avg_chunks if successful else None,
            'avg_keyword_match': avg_keyword_match if successful else None
        }
    }, f, indent=2)

print(f"✓ Full results saved to: {output_file}\n")
