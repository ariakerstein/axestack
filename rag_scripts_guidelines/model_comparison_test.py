#!/usr/bin/env python3
"""
Comprehensive Model Comparison Test
Tests 3 models across multiple cancer types and question categories to determine:
1. Which model is fastest
2. Which model gives best answers
3. Whether eval scores are reliable
4. Impact of semantic search on quality
"""

import os
import time
import json
from datetime import datetime
from dotenv import load_dotenv
import requests

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Models to test
MODELS = [
    {
        'name': 'Claude 4.5 Sonnet',
        'id': 'claude-3-5-sonnet',
        'expected_speed': 'slow (18-25s)',
        'expected_quality': 'highest'
    },
    {
        'name': 'Claude Haiku',
        'id': 'claude-3-haiku',
        'expected_speed': 'fast (5-10s)',
        'expected_quality': 'good'
    },
    {
        'name': 'GPT-4.1-nano',
        'id': 'gpt-4.1-nano',
        'expected_speed': 'fastest (2-5s)',
        'expected_quality': 'good'
    }
]

# Test questions across different dimensions
TEST_QUESTIONS = [
    # Treatment questions
    {
        'question': 'What is bipolar androgen therapy?',
        'cancer_type': 'Prostate',
        'category': 'treatment',
        'expected_chunks': 'webinar + NCCN prostate'
    },
    {
        'question': 'What are the side effects of immunotherapy?',
        'cancer_type': 'Lung',
        'category': 'side_effects',
        'expected_chunks': 'NCCN lung + general immunotherapy'
    },
    # Biomarker questions
    {
        'question': 'What is PD-L1 testing and why is it important?',
        'cancer_type': 'Lung',
        'category': 'biomarker',
        'expected_chunks': 'NCCN lung biomarkers'
    },
    {
        'question': 'Should I get BRCA testing for breast cancer?',
        'cancer_type': 'Breast',
        'category': 'biomarker',
        'expected_chunks': 'NCCN breast genetics'
    },
    # Staging questions
    {
        'question': 'What does stage 3 ovarian cancer mean?',
        'cancer_type': 'Ovarian',
        'category': 'staging',
        'expected_chunks': 'NCCN ovarian staging'
    },
    # General cancer questions
    {
        'question': 'What is metastatic cancer?',
        'cancer_type': 'General',
        'category': 'education',
        'expected_chunks': 'general cancer education'
    }
]

def call_edge_function(question, cancer_type, model_id):
    """Call edge function with specific model"""
    edge_url = f"{SUPABASE_URL}/functions/v1/direct-navis"
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }

    start_time = time.time()

    try:
        response = requests.post(
            edge_url,
            headers=headers,
            json={
                'question': question,
                'cancerType': cancer_type,
                'directMode': False,
                'model': model_id
            },
            timeout=120
        )

        elapsed = time.time() - start_time

        if response.status_code == 200:
            data = response.json()
            return {
                'success': True,
                'elapsed': elapsed,
                'data': data
            }
        else:
            return {
                'success': False,
                'elapsed': elapsed,
                'error': f"Status {response.status_code}: {response.text[:200]}"
            }

    except Exception as e:
        elapsed = time.time() - start_time
        return {
            'success': False,
            'elapsed': elapsed,
            'error': str(e)
        }

def analyze_result(result, question_info):
    """Analyze a single result"""
    if not result['success']:
        return {
            'error': result['error'],
            'latency': result['elapsed']
        }

    data = result['data']

    # Extract key metrics
    analysis = {
        'latency': {
            'total': result['elapsed'],
            'search': data.get('searchLatencyMs', 0) / 1000,
            'llm': data.get('llmLatencyMs', 0) / 1000,
        },
        'search': {
            'method': data.get('searchMethod', 'unknown'),
            'chunks_used': data.get('chunksUsed', 0),
            'top_chunk_similarity': None
        },
        'eval_scores': data.get('evaluationScores', {}),
        'answer': {
            'length': len(data.get('answer', '')),
            'preview': data.get('answer', '')[:200]
        },
        'citations': len(data.get('citations', []))
    }

    # Get top chunk similarity if available
    chunks = data.get('retrievedChunks', [])
    if chunks:
        analysis['search']['top_chunk_similarity'] = chunks[0].get('similarity')

    # Calculate a simple quality score based on objective criteria
    quality_indicators = {
        'has_chunks': analysis['search']['chunks_used'] > 0,
        'high_similarity': (analysis['search']['top_chunk_similarity'] or 0) > 0.55,
        'sufficient_length': analysis['answer']['length'] > 500,
        'has_citations': analysis['citations'] > 0,
        'uses_semantic_search': analysis['search']['method'] == 'semantic_vector_similarity'
    }

    analysis['quality_indicators'] = quality_indicators
    analysis['quality_score'] = sum(quality_indicators.values()) / len(quality_indicators)

    return analysis

def print_comparison_table(results):
    """Print comparison table"""
    print("\n" + "="*100)
    print("MODEL COMPARISON RESULTS")
    print("="*100 + "\n")

    # Group by question
    for question_info in TEST_QUESTIONS:
        q = question_info['question']
        cancer = question_info['cancer_type']
        category = question_info['category']

        print(f"\n{'='*100}")
        print(f"QUESTION: {q}")
        print(f"Cancer Type: {cancer} | Category: {category}")
        print(f"{'='*100}\n")

        # Header
        print(f"{'Model':<20} {'Latency':<15} {'Chunks':<10} {'Similarity':<12} {'Eval':<15} {'Quality':<10}")
        print("-" * 100)

        # Results for each model
        for model in MODELS:
            key = f"{model['id']}_{q}_{cancer}"
            if key in results:
                r = results[key]

                if 'error' in r:
                    print(f"{model['name']:<20} ERROR: {r['error'][:60]}")
                else:
                    latency = f"{r['latency']['total']:.1f}s"
                    chunks = str(r['search']['chunks_used'])
                    similarity = f"{r['search']['top_chunk_similarity']:.3f}" if r['search']['top_chunk_similarity'] else "N/A"

                    eval_scores = r['eval_scores']
                    eval_str = f"{eval_scores.get('confidenceLevel', 'N/A')} ({eval_scores.get('overallConfidence', 0):.1f})"

                    quality = f"{r['quality_score']:.0%}"

                    print(f"{model['name']:<20} {latency:<15} {chunks:<10} {similarity:<12} {eval_str:<15} {quality:<10}")

        print()

    # Summary statistics
    print("\n" + "="*100)
    print("SUMMARY STATISTICS")
    print("="*100 + "\n")

    for model in MODELS:
        model_results = [r for k, r in results.items() if k.startswith(model['id']) and 'error' not in r]

        if not model_results:
            continue

        avg_latency = sum(r['latency']['total'] for r in model_results) / len(model_results)
        avg_search_latency = sum(r['latency']['search'] for r in model_results) / len(model_results)
        avg_llm_latency = sum(r['latency']['llm'] for r in model_results) / len(model_results)
        avg_quality = sum(r['quality_score'] for r in model_results) / len(model_results)
        avg_chunks = sum(r['search']['chunks_used'] for r in model_results) / len(model_results)

        eval_confidences = [r['eval_scores'].get('confidenceLevel') for r in model_results]
        confidence_dist = {
            'high': eval_confidences.count('high'),
            'medium': eval_confidences.count('medium'),
            'low': eval_confidences.count('low')
        }

        print(f"{model['name']}:")
        print(f"  Avg Total Latency: {avg_latency:.1f}s")
        print(f"    ├─ Search: {avg_search_latency:.2f}s")
        print(f"    └─ LLM: {avg_llm_latency:.2f}s")
        print(f"  Avg Quality Score: {avg_quality:.0%}")
        print(f"  Avg Chunks Retrieved: {avg_chunks:.1f}")
        print(f"  Eval Confidence Distribution: high={confidence_dist['high']}, medium={confidence_dist['medium']}, low={confidence_dist['low']}")
        print()

def main():
    print("\n" + "="*100)
    print("COMPREHENSIVE MODEL COMPARISON TEST")
    print("="*100)
    print(f"\nTesting {len(MODELS)} models across {len(TEST_QUESTIONS)} questions")
    print(f"Total tests: {len(MODELS) * len(TEST_QUESTIONS)}\n")

    for model in MODELS:
        print(f"  • {model['name']} ({model['id']})")
        print(f"    Expected: {model['expected_speed']}, Quality: {model['expected_quality']}")

    print("\n" + "="*100 + "\n")

    results = {}
    total_tests = len(MODELS) * len(TEST_QUESTIONS)
    current_test = 0

    # Run tests
    for question_info in TEST_QUESTIONS:
        q = question_info['question']
        cancer = question_info['cancer_type']

        for model in MODELS:
            current_test += 1
            print(f"\n[{current_test}/{total_tests}] Testing {model['name']} with: {q[:60]}...")

            result = call_edge_function(q, cancer, model['id'])
            analysis = analyze_result(result, question_info)

            key = f"{model['id']}_{q}_{cancer}"
            results[key] = analysis

            if 'error' in analysis:
                print(f"  ❌ ERROR: {analysis['error'][:80]}")
            else:
                print(f"  ✓ {analysis['latency']['total']:.1f}s | {analysis['search']['chunks_used']} chunks | {analysis['quality_score']:.0%} quality")

            # Brief pause between requests
            time.sleep(0.5)

    # Print comparison table
    print_comparison_table(results)

    # Save results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'model_comparison_{timestamp}.json'

    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n✓ Results saved to: {output_file}\n")

    # Final recommendation
    print("="*100)
    print("RECOMMENDATION")
    print("="*100 + "\n")

    print("""
Based on the test results above, consider:

1. **Latency Priority** → Choose the fastest model with acceptable quality
2. **Quality Priority** → Choose Claude 4.5 Sonnet despite slower speed
3. **Balanced** → Choose model with best quality/speed ratio

Key questions to answer:
- Are eval scores consistent across models? (If not, they're not reliable)
- Does semantic search improve quality for all models? (Check quality_score)
- Is the speed difference worth the quality tradeoff?
    """)

if __name__ == '__main__':
    main()
