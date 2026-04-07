#!/usr/bin/env python3
"""
Check actual Circle production latency from database
"""

import os
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime, timedelta

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

print("\n" + "="*100)
print("CIRCLE PRODUCTION LATENCY CHECK")
print("="*100 + "\n")

# Get recent responses from last 2 hours
two_hours_ago = (datetime.now() - timedelta(hours=2)).isoformat()

print(f"Fetching responses since {two_hours_ago}...\n")

# Query response_evaluations for recent questions
result = supabase.table('response_evaluations')\
    .select('*')\
    .gte('created_at', two_hours_ago)\
    .order('created_at', desc=True)\
    .limit(20)\
    .execute()

if not result.data:
    print("No recent responses found in last 2 hours.")
    print("Expanding search to last 24 hours...\n")

    one_day_ago = (datetime.now() - timedelta(days=1)).isoformat()
    result = supabase.table('response_evaluations')\
        .select('*')\
        .gte('created_at', one_day_ago)\
        .order('created_at', desc=True)\
        .limit(20)\
        .execute()

responses = result.data

print(f"Found {len(responses)} recent responses\n")
print("="*100)

# Analyze each response
for i, resp in enumerate(responses[:10], 1):
    created_at = resp.get('created_at', '')
    question = resp.get('question', 'N/A')[:60]

    # Get latency metrics
    total_latency = resp.get('total_latency_ms', 0)
    search_latency = resp.get('search_latency_ms', 0)
    llm_latency = resp.get('llm_latency_ms', 0)

    # Get model and source info
    model_used = resp.get('model_used', 'unknown')
    source = resp.get('source', 'unknown')

    # Get eval info
    confidence = resp.get('confidence_level', 'unknown')
    overall_score = resp.get('overall_confidence', 0)

    print(f"\n{i}. {created_at}")
    print(f"   Question: {question}...")
    print(f"   Source: {source}")
    print(f"   Model: {model_used}")
    print(f"   Total Latency: {total_latency/1000:.1f}s")
    print(f"     ├─ Search: {search_latency/1000:.2f}s")
    print(f"     └─ LLM: {llm_latency/1000:.2f}s")
    print(f"   Eval: {confidence} ({overall_score:.1f})")

    # Check for issues
    if total_latency > 15000:
        print(f"   ⚠️  SLOW RESPONSE (>{total_latency/1000:.0f}s)")
    elif total_latency > 10000:
        print(f"   ⚠️  Over target ({total_latency/1000:.1f}s)")
    else:
        print(f"   ✓ Within target (<10s)")

# Calculate statistics
print("\n" + "="*100)
print("STATISTICS")
print("="*100 + "\n")

if responses:
    latencies = [r.get('total_latency_ms', 0) for r in responses if r.get('total_latency_ms')]
    search_latencies = [r.get('search_latency_ms', 0) for r in responses if r.get('search_latency_ms')]
    llm_latencies = [r.get('llm_latency_ms', 0) for r in responses if r.get('llm_latency_ms')]

    if latencies:
        avg_total = sum(latencies) / len(latencies)
        avg_search = sum(search_latencies) / len(search_latencies) if search_latencies else 0
        avg_llm = sum(llm_latencies) / len(llm_latencies) if llm_latencies else 0

        print(f"Average Latencies (n={len(latencies)}):")
        print(f"  Total: {avg_total/1000:.1f}s")
        print(f"  Search: {avg_search/1000:.2f}s")
        print(f"  LLM: {avg_llm/1000:.2f}s")

        # Calculate percentiles
        sorted_latencies = sorted(latencies)
        p50 = sorted_latencies[len(sorted_latencies)//2] if sorted_latencies else 0
        p95 = sorted_latencies[int(len(sorted_latencies)*0.95)] if sorted_latencies else 0

        print(f"\nPercentiles:")
        print(f"  P50 (median): {p50/1000:.1f}s")
        print(f"  P95: {p95/1000:.1f}s")

        # Model distribution
        models = [r.get('model_used', 'unknown') for r in responses]
        from collections import Counter
        model_counts = Counter(models)

        print(f"\nModel Distribution:")
        for model, count in model_counts.most_common():
            model_name = model.split('-')[-1] if 'claude' in model.lower() else model
            print(f"  {model_name}: {count} ({count/len(models)*100:.0f}%)")

        # Check if we're actually using Haiku
        haiku_responses = [r for r in responses if 'haiku' in r.get('model_used', '').lower()]
        sonnet_responses = [r for r in responses if 'sonnet' in r.get('model_used', '').lower()]

        print(f"\nModel Analysis:")
        print(f"  Haiku responses: {len(haiku_responses)}")
        print(f"  Sonnet responses: {len(sonnet_responses)}")

        if sonnet_responses:
            print(f"\n  ⚠️  WARNING: Still using Sonnet in production!")
            print(f"     Sonnet avg latency: {sum(r.get('total_latency_ms', 0) for r in sonnet_responses)/len(sonnet_responses)/1000:.1f}s")

        if haiku_responses:
            print(f"\n  ✓ Using Haiku in production")
            print(f"    Haiku avg latency: {sum(r.get('total_latency_ms', 0) for r in haiku_responses)/len(haiku_responses)/1000:.1f}s")

print("\n" + "="*100 + "\n")
