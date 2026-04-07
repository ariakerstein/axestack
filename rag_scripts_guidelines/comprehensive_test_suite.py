#!/usr/bin/env python3
"""
Comprehensive Test Suite - Cross-Category & Cancer Type Testing
Tests semantic search across different dimensions
Date: October 29, 2025
"""

import os
import json
import time
import requests
from datetime import datetime
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
EDGE_FUNCTION_URL = f"{SUPABASE_URL}/functions/v1/direct-navis"

# Comprehensive test matrix
TEST_MATRIX = {
    "brain_cancer": {
        "cancer_type": "brain",
        "questions": [
            {
                "question": "What are the treatment options for glioblastoma?",
                "category": "treatment",
                "expected_keywords": ["chemotherapy", "radiation", "surgery", "temozolomide"],
                "difficulty": "basic"
            },
            {
                "question": "What are the side effects of radiation therapy for brain tumors?",
                "category": "side_effects",
                "expected_keywords": ["fatigue", "hair loss", "cognitive", "memory"],
                "difficulty": "basic"
            },
            {
                "question": "What is the prognosis for stage 4 glioblastoma?",
                "category": "prognosis",
                "expected_keywords": ["survival", "months", "median", "prognosis"],
                "difficulty": "basic"
            },
            {
                "question": "Are there any experimental treatments for GBM?",
                "category": "treatment",
                "expected_keywords": ["clinical trial", "immunotherapy", "experimental"],
                "difficulty": "advanced",
                "note": "Tests synonym matching (GBM = glioblastoma)"
            }
        ]
    },

    "breast_cancer": {
        "cancer_type": "breast",
        "questions": [
            {
                "question": "How is breast cancer staged?",
                "category": "diagnosis",
                "expected_keywords": ["TNM", "stage", "tumor size", "lymph nodes"],
                "difficulty": "basic"
            },
            {
                "question": "What is the difference between hormone receptor positive and triple negative breast cancer?",
                "category": "subtype",
                "expected_keywords": ["ER", "PR", "HER2", "receptor"],
                "difficulty": "intermediate"
            },
            {
                "question": "Should I get genetic testing for breast cancer?",
                "category": "screening",
                "expected_keywords": ["BRCA", "genetic", "mutation", "family history"],
                "difficulty": "basic"
            },
            {
                "question": "What are the benefits of exercise during breast cancer treatment?",
                "category": "lifestyle",
                "expected_keywords": ["exercise", "physical activity", "fatigue", "quality of life"],
                "difficulty": "basic"
            }
        ]
    },

    "lung_cancer": {
        "cancer_type": "lung",
        "questions": [
            {
                "question": "What are the latest immunotherapy options for lung cancer?",
                "category": "treatment",
                "expected_keywords": ["pembrolizumab", "nivolumab", "checkpoint inhibitor", "PD-1"],
                "difficulty": "advanced"
            },
            {
                "question": "How does targeted therapy work for lung cancer?",
                "category": "treatment",
                "expected_keywords": ["EGFR", "ALK", "targeted therapy", "mutation"],
                "difficulty": "intermediate"
            }
        ]
    },

    "prostate_cancer": {
        "cancer_type": "prostate",
        "questions": [
            {
                "question": "What is bipolar androgen therapy?",
                "category": "treatment",
                "expected_keywords": ["testosterone", "androgen", "cycling", "BAT"],
                "difficulty": "advanced",
                "note": "Tests webinar content retrieval"
            },
            {
                "question": "What are the side effects of hormone therapy for prostate cancer?",
                "category": "side_effects",
                "expected_keywords": ["hot flashes", "fatigue", "bone loss", "ADT"],
                "difficulty": "basic"
            }
        ]
    },

    "general": {
        "cancer_type": None,  # No specific cancer type
        "questions": [
            {
                "question": "What lifestyle changes can help during cancer treatment?",
                "category": "lifestyle",
                "expected_keywords": ["nutrition", "exercise", "rest", "stress"],
                "difficulty": "basic"
            },
            {
                "question": "How can I manage cancer-related fatigue?",
                "category": "supportive_care",
                "expected_keywords": ["fatigue", "rest", "exercise", "energy"],
                "difficulty": "basic"
            },
            {
                "question": "What should I know about clinical trials?",
                "category": "research",
                "expected_keywords": ["clinical trial", "research", "enrollment", "phases"],
                "difficulty": "intermediate"
            }
        ]
    },

    "edge_cases": {
        "cancer_type": "brain",  # Set one, but ask about another
        "questions": [
            {
                "question": "What are the treatment options for breast cancer?",
                "category": "treatment",
                "expected_keywords": ["surgery", "chemotherapy", "radiation", "hormone therapy"],
                "difficulty": "edge_case",
                "note": "Tests cancer type mismatch handling"
            },
            {
                "question": "Tell me about pancreatic cancer",
                "category": "general",
                "expected_keywords": ["pancreas", "treatment", "prognosis"],
                "difficulty": "edge_case",
                "note": "Tests robustness when profile != question"
            }
        ]
    }
}


def call_direct_navis_api(question: str, cancer_type: str = None) -> Dict[str, Any]:
    """Call the direct-navis edge function API"""
    headers = {
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }

    payload = {
        'question': question,
        'cancerType': cancer_type,
        'directMode': False,
        'model': 'claude-3-5-sonnet'
    }

    start_time = time.time()

    try:
        response = requests.post(
            EDGE_FUNCTION_URL,
            headers=headers,
            json=payload,
            timeout=60
        )

        elapsed_time = time.time() - start_time

        if response.status_code == 200:
            data = response.json()
            return {
                'success': True,
                'question': question,
                'cancer_type': cancer_type,
                'response_id': data.get('responseId'),
                'answer': data.get('answer'),
                'answer_length': len(data.get('answer', '')),
                'elapsed_time': elapsed_time,
                'status_code': response.status_code,
                'error': None
            }
        else:
            return {
                'success': False,
                'question': question,
                'cancer_type': cancer_type,
                'response_id': None,
                'answer': None,
                'answer_length': 0,
                'elapsed_time': elapsed_time,
                'status_code': response.status_code,
                'error': response.text
            }

    except Exception as e:
        elapsed_time = time.time() - start_time
        return {
            'success': False,
            'question': question,
            'cancer_type': cancer_type,
            'response_id': None,
            'answer': None,
            'answer_length': 0,
            'elapsed_time': elapsed_time,
            'status_code': None,
            'error': str(e)
        }


def run_comprehensive_test_suite(test_type: str = "baseline") -> List[Dict[str, Any]]:
    """Run comprehensive test suite across all categories"""
    print(f"\n{'#'*70}")
    print(f"# COMPREHENSIVE TEST SUITE - {test_type.upper()}")
    print(f"# Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*70}\n")

    all_results = []
    test_number = 0

    for category_name, category_data in TEST_MATRIX.items():
        print(f"\n{'='*70}")
        print(f"TESTING: {category_name.upper()}")
        print(f"{'='*70}\n")

        cancer_type = category_data['cancer_type']
        questions = category_data['questions']

        for q_data in questions:
            test_number += 1

            print(f"[{test_number}] {q_data['question'][:60]}...")
            print(f"    Category: {q_data['category']}")
            print(f"    Difficulty: {q_data['difficulty']}")
            if q_data.get('note'):
                print(f"    Note: {q_data['note']}")

            result = call_direct_navis_api(q_data['question'], cancer_type)

            # Add test metadata
            result['test_number'] = test_number
            result['category_name'] = category_name
            result['category'] = q_data['category']
            result['difficulty'] = q_data['difficulty']
            result['expected_keywords'] = q_data['expected_keywords']
            result['note'] = q_data.get('note')
            result['test_type'] = test_type
            result['timestamp'] = datetime.now().isoformat()

            # Check if expected keywords appear in answer
            if result['success'] and result['answer']:
                keywords_found = [
                    kw for kw in q_data['expected_keywords']
                    if kw.lower() in result['answer'].lower()
                ]
                result['keywords_found'] = keywords_found
                result['keyword_match_rate'] = len(keywords_found) / len(q_data['expected_keywords'])
            else:
                result['keywords_found'] = []
                result['keyword_match_rate'] = 0.0

            all_results.append(result)

            # Print result
            if result['success']:
                print(f"    ✓ Success in {result['elapsed_time']:.2f}s")
                print(f"    Answer length: {result['answer_length']} chars")
                print(f"    Keywords matched: {len(result['keywords_found'])}/{len(q_data['expected_keywords'])}")
            else:
                print(f"    ✗ Failed: {result['error'][:100]}")

            # Brief pause
            time.sleep(2)

    return all_results


def save_results(results: List[Dict[str, Any]], test_type: str):
    """Save results to JSON file"""
    filename = f"comprehensive_test_results_{test_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    filepath = os.path.join(os.path.dirname(__file__), filename)

    with open(filepath, 'w') as f:
        json.dump({
            'test_type': test_type,
            'timestamp': datetime.now().isoformat(),
            'total_tests': len(results),
            'results': results
        }, f, indent=2)

    print(f"\n✓ Results saved to: {filepath}")
    return filepath


def print_summary(results: List[Dict[str, Any]]):
    """Print summary statistics"""
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]

    print(f"\n{'='*70}")
    print(f"TEST SUMMARY")
    print(f"{'='*70}")
    print(f"Total tests: {len(results)}")
    print(f"Successful: {len(successful)}")
    print(f"Failed: {len(failed)}")

    if successful:
        avg_time = sum(r['elapsed_time'] for r in successful) / len(successful)
        avg_length = sum(r['answer_length'] for r in successful) / len(successful)
        avg_keyword_match = sum(r['keyword_match_rate'] for r in successful) / len(successful)

        print(f"\nLatency Statistics:")
        print(f"  Average: {avg_time:.2f}s")
        print(f"  Min: {min(r['elapsed_time'] for r in successful):.2f}s")
        print(f"  Max: {max(r['elapsed_time'] for r in successful):.2f}s")

        print(f"\nResponse Quality:")
        print(f"  Avg answer length: {avg_length:.0f} chars")
        print(f"  Avg keyword match: {avg_keyword_match:.1%}")

    # Breakdown by category
    print(f"\nBreakdown by Category:")
    categories = {}
    for r in results:
        cat = r['category_name']
        if cat not in categories:
            categories[cat] = {'total': 0, 'success': 0}
        categories[cat]['total'] += 1
        if r['success']:
            categories[cat]['success'] += 1

    for cat, stats in categories.items():
        success_rate = stats['success'] / stats['total'] * 100
        print(f"  {cat}: {stats['success']}/{stats['total']} ({success_rate:.0f}%)")

    # Breakdown by difficulty
    print(f"\nBreakdown by Difficulty:")
    difficulties = {}
    for r in results:
        diff = r['difficulty']
        if diff not in difficulties:
            difficulties[diff] = {'total': 0, 'success': 0}
        difficulties[diff]['total'] += 1
        if r['success']:
            difficulties[diff]['success'] += 1

    for diff, stats in difficulties.items():
        success_rate = stats['success'] / stats['total'] * 100
        print(f"  {diff}: {stats['success']}/{stats['total']} ({success_rate:.0f}%)")

    if failed:
        print(f"\n⚠️ Failed Tests:")
        for r in failed:
            print(f"  - [{r['category_name']}] {r['question'][:50]}...")
            print(f"    Error: {r['error'][:100]}")

    print(f"{'='*70}\n")


def main():
    """Main execution"""
    # Check environment variables
    if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY]):
        print("❌ Error: Missing environment variables")
        print("Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
        return

    print(f"\n{'#'*70}")
    print(f"# COMPREHENSIVE RAG PIPELINE TEST SUITE")
    print(f"{'#'*70}\n")

    print("Test Matrix:")
    total_tests = sum(len(cat['questions']) for cat in TEST_MATRIX.values())
    print(f"  Total tests: {total_tests}")
    print(f"  Categories: {len(TEST_MATRIX)}")
    print(f"  Cancer types: brain, breast, lung, prostate, general, edge cases")
    print(f"  Estimated time: {total_tests * 10 / 60:.1f} minutes")

    print("\nWhat type of test are you running?")
    print("1. Baseline (before semantic search deployment)")
    print("2. Post-change (after semantic search + Claude 3.5)")
    choice = input("\nEnter choice (1 or 2): ").strip()

    test_type = "baseline" if choice == "1" else "post_change"

    # Run tests
    results = run_comprehensive_test_suite(test_type)

    # Save results
    filepath = save_results(results, test_type)

    # Print summary
    print_summary(results)

    print(f"\n✓ Comprehensive test run complete!")
    print(f"  Results saved to: {filepath}")
    print(f"  Run comparison script to analyze improvements\n")


if __name__ == "__main__":
    main()
