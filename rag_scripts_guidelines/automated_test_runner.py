#!/usr/bin/env python3
"""
Automated Test Runner for RAG Pipeline
Runs test questions through the API and captures metrics
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

# Test questions covering different cancer types and query patterns
TEST_QUESTIONS = [
    {
        "question": "What are the treatment options for glioblastoma?",
        "cancer_type": "brain",
        "category": "treatment",
        "expected_keywords": ["chemotherapy", "radiation", "surgery", "temozolomide"]
    },
    {
        "question": "What are the side effects of radiation therapy for brain tumors?",
        "cancer_type": "brain",
        "category": "side_effects",
        "expected_keywords": ["fatigue", "hair loss", "cognitive", "memory"]
    },
    {
        "question": "How is breast cancer staged?",
        "cancer_type": "breast",
        "category": "diagnosis",
        "expected_keywords": ["TNM", "stage", "tumor size", "lymph nodes"]
    },
    {
        "question": "What is the difference between hormone receptor positive and triple negative breast cancer?",
        "cancer_type": "breast",
        "category": "subtype",
        "expected_keywords": ["ER", "PR", "HER2", "receptor"]
    },
    {
        "question": "What are the latest immunotherapy options for lung cancer?",
        "cancer_type": "lung",
        "category": "treatment",
        "expected_keywords": ["pembrolizumab", "nivolumab", "checkpoint inhibitor", "PD-1"]
    },
    {
        "question": "What lifestyle changes can help during cancer treatment?",
        "cancer_type": None,  # General question
        "category": "supportive_care",
        "expected_keywords": ["nutrition", "exercise", "rest", "stress"]
    },
    {
        "question": "What is the prognosis for stage 4 glioblastoma?",
        "cancer_type": "brain",
        "category": "prognosis",
        "expected_keywords": ["survival", "months", "prognosis", "median"]
    },
    {
        "question": "Should I get genetic testing for breast cancer?",
        "cancer_type": "breast",
        "category": "screening",
        "expected_keywords": ["BRCA", "genetic", "mutation", "family history"]
    }
]


def call_direct_navis_api(question: str, cancer_type: str = None) -> Dict[str, Any]:
    """
    Call the direct-navis edge function API
    """
    headers = {
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }

    payload = {
        'question': question,
        'cancerType': cancer_type,
        'directMode': False,
        'model': 'claude-3-5-sonnet'  # Using the updated model
    }

    print(f"\n{'='*60}")
    print(f"Question: {question[:60]}...")
    print(f"Cancer Type: {cancer_type or 'None'}")
    print(f"{'='*60}")

    start_time = time.time()

    try:
        response = requests.post(
            EDGE_FUNCTION_URL,
            headers=headers,
            json=payload,
            timeout=60  # 60 second timeout
        )

        elapsed_time = time.time() - start_time

        if response.status_code == 200:
            data = response.json()
            print(f"✓ Success in {elapsed_time:.2f}s")
            print(f"  Response ID: {data.get('responseId', 'N/A')}")
            print(f"  Answer length: {len(data.get('answer', ''))} chars")

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
            print(f"✗ Error: {response.status_code}")
            print(f"  Response: {response.text[:200]}")

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

    except requests.exceptions.Timeout:
        elapsed_time = time.time() - start_time
        print(f"✗ Timeout after {elapsed_time:.2f}s")

        return {
            'success': False,
            'question': question,
            'cancer_type': cancer_type,
            'response_id': None,
            'answer': None,
            'answer_length': 0,
            'elapsed_time': elapsed_time,
            'status_code': None,
            'error': 'Request timeout'
        }

    except Exception as e:
        elapsed_time = time.time() - start_time
        print(f"✗ Exception: {str(e)}")

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


def run_test_suite(test_type: str = "baseline") -> List[Dict[str, Any]]:
    """
    Run all test questions and collect results
    """
    print(f"\n{'#'*60}")
    print(f"# Running {test_type.upper()} Test Suite")
    print(f"# Total questions: {len(TEST_QUESTIONS)}")
    print(f"# Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*60}\n")

    results = []

    for i, test_case in enumerate(TEST_QUESTIONS, 1):
        print(f"\n[{i}/{len(TEST_QUESTIONS)}] Testing...")

        result = call_direct_navis_api(
            question=test_case['question'],
            cancer_type=test_case['cancer_type']
        )

        # Add test metadata
        result['test_number'] = i
        result['category'] = test_case['category']
        result['expected_keywords'] = test_case['expected_keywords']
        result['test_type'] = test_type
        result['timestamp'] = datetime.now().isoformat()

        results.append(result)

        # Brief pause between requests to avoid overwhelming the API
        if i < len(TEST_QUESTIONS):
            time.sleep(2)

    return results


def save_results(results: List[Dict[str, Any]], test_type: str):
    """
    Save results to JSON file
    """
    filename = f"test_results_{test_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    filepath = os.path.join(os.path.dirname(__file__), filename)

    with open(filepath, 'w') as f:
        json.dump({
            'test_type': test_type,
            'timestamp': datetime.now().isoformat(),
            'total_questions': len(results),
            'results': results
        }, f, indent=2)

    print(f"\n✓ Results saved to: {filepath}")
    return filepath


def print_summary(results: List[Dict[str, Any]]):
    """
    Print summary statistics
    """
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]

    print(f"\n{'='*60}")
    print(f"TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Total questions: {len(results)}")
    print(f"Successful: {len(successful)}")
    print(f"Failed: {len(failed)}")

    if successful:
        avg_time = sum(r['elapsed_time'] for r in successful) / len(successful)
        min_time = min(r['elapsed_time'] for r in successful)
        max_time = max(r['elapsed_time'] for r in successful)
        avg_length = sum(r['answer_length'] for r in successful) / len(successful)

        print(f"\nLatency Statistics:")
        print(f"  Average: {avg_time:.2f}s")
        print(f"  Min: {min_time:.2f}s")
        print(f"  Max: {max_time:.2f}s")
        print(f"\nResponse Statistics:")
        print(f"  Average length: {avg_length:.0f} chars")

    if failed:
        print(f"\n⚠️ Failed Questions:")
        for r in failed:
            print(f"  - {r['question'][:60]}...")
            print(f"    Error: {r['error'][:100]}")

    print(f"{'='*60}\n")


def fetch_database_metrics(response_ids: List[str]):
    """
    Fetch detailed metrics from database for the test responses
    This requires running SQL queries separately
    """
    print(f"\n{'='*60}")
    print(f"DATABASE METRICS")
    print(f"{'='*60}")
    print(f"\nTo fetch detailed metrics from database, run this SQL query:")
    print(f"\n```sql")
    print(f"SELECT")
    print(f"  question,")
    print(f"  accuracy_score,")
    print(f"  completeness_score,")
    print(f"  source_support_score,")
    print(f"  clarity_score,")
    print(f"  overall_confidence,")
    print(f"  total_latency_ms / 1000.0 as total_sec,")
    print(f"  search_latency_ms / 1000.0 as search_sec,")
    print(f"  llm_latency_ms / 1000.0 as llm_sec,")
    print(f"  evaluation_latency_ms / 1000.0 as eval_sec,")
    print(f"  jsonb_array_length(raw_metrics->'retrievedChunks') as num_chunks,")
    print(f"  raw_metrics->>'searchMethod' as search_method")
    print(f"FROM response_evaluations")
    print(f"WHERE id IN (")

    for i, response_id in enumerate(response_ids):
        comma = "," if i < len(response_ids) - 1 else ""
        print(f"  '{response_id}'{comma}")

    print(f")")
    print(f"ORDER BY created_at;")
    print(f"```\n")


def main():
    """
    Main execution
    """
    # Check environment variables
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Error: Missing environment variables")
        print("Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
        print("Check your .env file in rag_scripts_guidelines folder")
        return

    print(f"\n{'#'*60}")
    print(f"# AUTOMATED RAG PIPELINE TEST RUNNER")
    print(f"# Environment: {SUPABASE_URL}")
    print(f"{'#'*60}\n")

    # Ask user what type of test
    print("What type of test are you running?")
    print("1. Baseline (before changes)")
    print("2. Post-change (after semantic search + Claude 3.5)")
    choice = input("\nEnter choice (1 or 2): ").strip()

    test_type = "baseline" if choice == "1" else "post_change"

    # Run tests
    results = run_test_suite(test_type)

    # Save results
    filepath = save_results(results, test_type)

    # Print summary
    print_summary(results)

    # Get response IDs for database query
    response_ids = [r['response_id'] for r in results if r['response_id']]
    if response_ids:
        fetch_database_metrics(response_ids)

    print(f"\n✓ Test run complete!")
    print(f"  Results saved to: {filepath}")
    print(f"  Run comparison_after_changes.sql to analyze metrics\n")


if __name__ == "__main__":
    main()
