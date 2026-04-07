#!/usr/bin/env python3
"""
Verify which Claude model is ACTUALLY being used
Check if it's Claude 3.5 or 4.5
"""

import os
import time
from dotenv import load_dotenv
import requests

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

print("\n" + "="*70)
print("MODEL VERIFICATION - Which Claude are we using?")
print("="*70 + "\n")

edge_url = f"{SUPABASE_URL}/functions/v1/direct-navis"
headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

# Test question
question = "What is bipolar androgen therapy?"

print(f"Question: {question}")
print(f"Requesting model: 'claude-3-5-sonnet'\n")

start = time.time()

response = requests.post(
    edge_url,
    headers=headers,
    json={
        'question': question,
        'cancerType': 'Prostate',
        'directMode': False,
        'model': 'claude-3-5-sonnet'  # Explicitly request 3.5
    },
    timeout=120
)

elapsed = time.time() - start
data = response.json()

print("="*70)
print("RESULTS")
print("="*70 + "\n")

print(f"Total latency: {elapsed:.2f}s")
print(f"Model used: {data.get('modelUsed', 'unknown')}")
print(f"Search method: {data.get('searchMethod', 'unknown')}")
print(f"Chunks used: {data.get('chunksUsed', 0)}")
print(f"LLM latency: {data.get('llmLatencyMs', 0)}ms")
print(f"Search latency: {data.get('searchLatencyMs', 0)}ms")

print("\n" + "="*70)
print("DIAGNOSIS")
print("="*70 + "\n")

model_used = data.get('modelUsed', 'unknown')

# Check if correct model
if 'claude-sonnet-4-5' in model_used or '4-5' in model_used or '4.5' in model_used:
    print("❌ PROBLEM: Using Claude 4.5 (slow model)")
    print("   Expected: Claude 3.5")
    print("   Actual: Claude 4.5")
    print("\n   Why is this happening?")
    print("   → Model mapping in edge function maps 'claude-3-5-sonnet' to 4.5")
    print("   → This was done in previous deployment")
elif 'claude-3-5' in model_used or '3.5' in model_used:
    print("✓ CORRECT: Using Claude 3.5")
else:
    print(f"⚠️  Unknown model: {model_used}")

# Check latency
if elapsed > 20:
    print(f"\n❌ VERY SLOW: {elapsed:.1f}s is too slow")
    if data.get('chunksUsed', 0) == 0:
        print("   → Cause: No chunks retrieved (search broken)")
        print("   → Solution: Paste SQL function")
    else:
        print("   → Might be using slow Claude 4.5 model")
elif elapsed > 10:
    print(f"\n⚠️  MODERATE: {elapsed:.1f}s is acceptable but could be faster")
else:
    print(f"\n✓ FAST: {elapsed:.1f}s is good")

# Check search
if data.get('chunksUsed', 0) == 0:
    print("\n❌ CRITICAL: 0 chunks retrieved")
    print("   → Search is BROKEN")
    print("   → Claude answering from general knowledge")
    print("   → THIS is why it's slow")

print("\n" + "="*70 + "\n")
