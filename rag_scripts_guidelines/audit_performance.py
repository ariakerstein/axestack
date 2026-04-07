#!/usr/bin/env python3
"""Audit edge function performance with detailed timing"""

import os
import time
from dotenv import load_dotenv
import requests

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

print("\n" + "="*70)
print("PERFORMANCE AUDIT - Edge Function")
print("="*70 + "\n")

test_url = f"{SUPABASE_URL}/functions/v1/direct-navis"
headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

# Test with a simple question
test_payload = {
    'question': 'What is bipolar androgen therapy?',
    'cancerType': 'Prostate',
    'directMode': False,
    'model': 'claude-3-5-sonnet'
}

print(f"Testing question: {test_payload['question']}")
print(f"Cancer Type: {test_payload['cancerType']}")
print(f"Model: {test_payload['model']}\n")

start_time = time.time()
print("⏱️  Starting request...\n")

try:
    response = requests.post(test_url, headers=headers, json=test_payload, timeout=120)
    end_time = time.time()
    total_time = end_time - start_time

    if response.status_code == 200:
        data = response.json()

        print("✓ SUCCESS!\n")
        print("="*70)
        print("TIMING BREAKDOWN")
        print("="*70)
        print(f"  Total request time: {total_time:.2f}s")
        print(f"  Search method: {data.get('searchMethod', 'unknown')}")
        print(f"  Search latency: {data.get('searchLatencyMs', 0)}ms")
        print(f"  LLM latency: {data.get('llmLatencyMs', 0)}ms")
        print(f"  Total API latency: {data.get('totalLatencyMs', 0)}ms")

        print("\n" + "="*70)
        print("RESULT DETAILS")
        print("="*70)
        print(f"  Chunks found: {data.get('chunksUsed', 0)}")
        print(f"  Answer length: {len(data.get('answer', ''))} chars")
        print(f"  Model used: {data.get('modelUsed', 'unknown')}")

        # Check if using guideline content
        chunks_data = data.get('retrievedChunks', [])
        if chunks_data:
            print(f"\n  Retrieved chunks:")
            for i, chunk in enumerate(chunks_data[:3], 1):
                title = chunk.get('guideline_title', 'Unknown')[:50]
                tier = chunk.get('content_tier', 'unknown')
                print(f"    {i}. {title}... (tier: {tier})")

        print("\n" + "="*70)
        print("PERFORMANCE ANALYSIS")
        print("="*70)

        search_ms = data.get('searchLatencyMs', 0)
        llm_ms = data.get('llmLatencyMs', 0)

        if llm_ms > 15000:
            print("  ⚠️  LLM latency is HIGH (>15s)")
            print("     → Claude 4.5 is slow, consider using Claude 3.5")
        elif llm_ms > 10000:
            print("  ⚠️  LLM latency is moderate (10-15s)")
        else:
            print("  ✓  LLM latency is good (<10s)")

        if search_ms > 2000:
            print("  ⚠️  Search latency is HIGH (>2s)")
            print("     → Consider optimizing search or adding indexes")
        elif search_ms > 1000:
            print("  ⚠️  Search latency is moderate (1-2s)")
        else:
            print("  ✓  Search latency is good (<1s)")

        if data.get('searchMethod') == 'unknown':
            print("  ⚠️  Search method is 'unknown'")
            print("     → No search was performed, using direct Claude API")
            print("     → This means no guideline chunks were retrieved")

        print("\n  Answer preview:")
        print(f"  {data.get('answer', '')[:200]}...")

    else:
        print(f"✗ ERROR: {response.status_code}")
        print(f"  Response: {response.text[:500]}")

except Exception as e:
    end_time = time.time()
    total_time = end_time - start_time
    print(f"✗ Request failed after {total_time:.2f}s")
    print(f"  Error: {e}")

print("\n" + "="*70 + "\n")
