#!/usr/bin/env python3
"""
Compare Test Results - Baseline vs Post-Change
Analyzes JSON results from automated_test_runner.py
Date: October 29, 2025
"""

import json
import glob
import os
from typing import Dict, List, Any
from datetime import datetime


def load_latest_results(test_type: str) -> Dict[str, Any]:
    """
    Load the most recent test results for a given type
    """
    pattern = f"test_results_{test_type}_*.json"
    files = glob.glob(os.path.join(os.path.dirname(__file__), pattern))

    if not files:
        return None

    # Get the most recent file
    latest_file = max(files, key=os.path.getctime)

    with open(latest_file, 'r') as f:
        data = json.load(f)

    print(f"✓ Loaded {test_type} results from: {os.path.basename(latest_file)}")
    print(f"  Timestamp: {data['timestamp']}")
    print(f"  Questions: {data['total_questions']}")

    return data


def calculate_statistics(results: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Calculate summary statistics from results
    """
    successful = [r for r in results if r['success']]

    if not successful:
        return {
            'success_rate': 0.0,
            'avg_latency': 0.0,
            'min_latency': 0.0,
            'max_latency': 0.0,
            'avg_answer_length': 0.0,
            'total_questions': len(results),
            'successful_questions': 0
        }

    return {
        'success_rate': len(successful) / len(results) * 100,
        'avg_latency': sum(r['elapsed_time'] for r in successful) / len(successful),
        'min_latency': min(r['elapsed_time'] for r in successful),
        'max_latency': max(r['elapsed_time'] for r in successful),
        'avg_answer_length': sum(r['answer_length'] for r in successful) / len(successful),
        'total_questions': len(results),
        'successful_questions': len(successful)
    }


def print_comparison_table(baseline_stats: Dict, post_change_stats: Dict):
    """
    Print side-by-side comparison table
    """
    print(f"\n{'='*80}")
    print(f"LATENCY COMPARISON")
    print(f"{'='*80}")
    print(f"{'Metric':<30} {'Baseline':<20} {'Post-Change':<20} {'Delta':<10}")
    print(f"{'-'*80}")

    # Success rate
    baseline_success = baseline_stats['success_rate']
    post_success = post_change_stats['success_rate']
    print(f"{'Success Rate':<30} {baseline_success:>18.1f}% {post_success:>18.1f}% {post_success - baseline_success:>9.1f}%")

    # Average latency
    baseline_avg = baseline_stats['avg_latency']
    post_avg = post_change_stats['avg_latency']
    delta_avg = post_avg - baseline_avg
    pct_change = (delta_avg / baseline_avg * 100) if baseline_avg > 0 else 0

    print(f"{'Average Latency':<30} {baseline_avg:>17.2f}s {post_avg:>17.2f}s {delta_avg:>8.2f}s")
    print(f"{'  (% change)':<30} {'':<20} {'':<20} {pct_change:>8.1f}%")

    # Min latency
    baseline_min = baseline_stats['min_latency']
    post_min = post_change_stats['min_latency']
    print(f"{'Min Latency':<30} {baseline_min:>17.2f}s {post_min:>17.2f}s {post_min - baseline_min:>8.2f}s")

    # Max latency
    baseline_max = baseline_stats['max_latency']
    post_max = post_change_stats['max_latency']
    print(f"{'Max Latency':<30} {baseline_max:>17.2f}s {post_max:>17.2f}s {post_max - baseline_max:>8.2f}s")

    # Answer length
    baseline_len = baseline_stats['avg_answer_length']
    post_len = post_change_stats['avg_answer_length']
    print(f"{'Avg Answer Length':<30} {baseline_len:>15.0f} ch {post_len:>15.0f} ch {post_len - baseline_len:>7.0f} ch")

    print(f"{'='*80}\n")

    # Assessment
    if pct_change < -40:
        print("🚀 MAJOR SPEEDUP! Latency reduced by more than 40%")
    elif pct_change < -20:
        print("✅ GOOD SPEEDUP! Latency reduced by more than 20%")
    elif pct_change > 20:
        print("⚠️ SLOWER! Latency increased by more than 20%")
    else:
        print("≈ NO SIGNIFICANT CHANGE in latency")

    if post_success < baseline_success - 10:
        print("⚠️ WARNING: Success rate decreased significantly")
    elif post_success > baseline_success:
        print("✅ Success rate improved")


def print_detailed_comparison(baseline_results: List[Dict], post_change_results: List[Dict]):
    """
    Print question-by-question comparison
    """
    print(f"\n{'='*80}")
    print(f"QUESTION-BY-QUESTION COMPARISON")
    print(f"{'='*80}\n")

    # Match questions by their content
    baseline_by_question = {r['question']: r for r in baseline_results}
    post_by_question = {r['question']: r for r in post_change_results}

    for question in baseline_by_question.keys():
        if question not in post_by_question:
            continue

        baseline = baseline_by_question[question]
        post = post_by_question[question]

        print(f"Q: {question[:70]}...")
        print(f"   Category: {baseline['category']}")

        if baseline['success'] and post['success']:
            baseline_time = baseline['elapsed_time']
            post_time = post['elapsed_time']
            delta = post_time - baseline_time
            pct = (delta / baseline_time * 100) if baseline_time > 0 else 0

            print(f"   Latency:  {baseline_time:.2f}s → {post_time:.2f}s ({delta:+.2f}s, {pct:+.1f}%)")
            print(f"   Answer:   {baseline['answer_length']} ch → {post['answer_length']} ch")

            if pct < -30:
                print(f"   ✅ Much faster!")
            elif pct > 30:
                print(f"   ⚠️ Slower!")

        elif not baseline['success'] and post['success']:
            print(f"   ✅ FIXED! Was failing, now succeeds in {post['elapsed_time']:.2f}s")

        elif baseline['success'] and not post['success']:
            print(f"   ⚠️ REGRESSION! Was working, now fails: {post['error'][:50]}")

        else:
            print(f"   ❌ Both failed")

        print()


def generate_sql_for_database_metrics(baseline_ids: List[str], post_ids: List[str]):
    """
    Generate SQL query to fetch database metrics for comparison
    """
    print(f"\n{'='*80}")
    print(f"DATABASE METRICS COMPARISON SQL")
    print(f"{'='*80}\n")

    print("Run this query in Supabase SQL Editor to compare quality scores:\n")
    print("```sql")
    print("WITH baseline AS (")
    print("  SELECT")
    print("    'baseline' as version,")
    print("    question,")
    print("    accuracy_score,")
    print("    completeness_score,")
    print("    source_support_score,")
    print("    overall_confidence,")
    print("    total_latency_ms / 1000.0 as total_sec,")
    print("    llm_latency_ms / 1000.0 as llm_sec,")
    print("    search_latency_ms / 1000.0 as search_sec,")
    print("    jsonb_array_length(raw_metrics->'retrievedChunks') as num_chunks,")
    print("    raw_metrics->>'searchMethod' as search_method")
    print("  FROM response_evaluations")
    print("  WHERE id IN (")
    for i, rid in enumerate(baseline_ids):
        comma = "," if i < len(baseline_ids) - 1 else ""
        print(f"    '{rid}'{comma}")
    print("  )")
    print("),")
    print("post_change AS (")
    print("  SELECT")
    print("    'post_change' as version,")
    print("    question,")
    print("    accuracy_score,")
    print("    completeness_score,")
    print("    source_support_score,")
    print("    overall_confidence,")
    print("    total_latency_ms / 1000.0 as total_sec,")
    print("    llm_latency_ms / 1000.0 as llm_sec,")
    print("    search_latency_ms / 1000.0 as search_sec,")
    print("    jsonb_array_length(raw_metrics->'retrievedChunks') as num_chunks,")
    print("    raw_metrics->>'searchMethod' as search_method")
    print("  FROM response_evaluations")
    print("  WHERE id IN (")
    for i, rid in enumerate(post_ids):
        comma = "," if i < len(post_ids) - 1 else ""
        print(f"    '{rid}'{comma}")
    print("  )")
    print(")")
    print("SELECT")
    print("  b.question,")
    print("  b.accuracy_score as baseline_accuracy,")
    print("  p.accuracy_score as post_accuracy,")
    print("  ROUND(p.accuracy_score - b.accuracy_score, 2) as accuracy_delta,")
    print("  b.total_sec as baseline_sec,")
    print("  p.total_sec as post_sec,")
    print("  ROUND(p.total_sec - b.total_sec, 2) as sec_delta,")
    print("  b.num_chunks as baseline_chunks,")
    print("  p.num_chunks as post_chunks,")
    print("  b.search_method as baseline_method,")
    print("  p.search_method as post_method")
    print("FROM baseline b")
    print("FULL OUTER JOIN post_change p ON LOWER(TRIM(b.question)) = LOWER(TRIM(p.question))

;")
    print("```\n")


def main():
    """
    Main execution
    """
    print(f"\n{'#'*80}")
    print(f"# TEST RESULTS COMPARISON")
    print(f"# {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*80}\n")

    # Load baseline results
    print("Loading baseline results...")
    baseline_data = load_latest_results("baseline")

    if not baseline_data:
        print("❌ No baseline results found. Run tests with option 1 first.")
        return

    # Load post-change results
    print("\nLoading post-change results...")
    post_change_data = load_latest_results("post_change")

    if not post_change_data:
        print("❌ No post-change results found. Run tests with option 2 first.")
        return

    print()

    # Calculate statistics
    baseline_stats = calculate_statistics(baseline_data['results'])
    post_change_stats = calculate_statistics(post_change_data['results'])

    # Print comparison table
    print_comparison_table(baseline_stats, post_change_stats)

    # Print detailed comparison
    print_detailed_comparison(baseline_data['results'], post_change_data['results'])

    # Generate SQL for database metrics
    baseline_ids = [r['response_id'] for r in baseline_data['results'] if r.get('response_id')]
    post_ids = [r['response_id'] for r in post_change_data['results'] if r.get('response_id')]

    if baseline_ids and post_ids:
        generate_sql_for_database_metrics(baseline_ids, post_ids)

    print("\n✓ Comparison complete!\n")


if __name__ == "__main__":
    main()
