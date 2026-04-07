#!/usr/bin/env python3
"""
DEBUG: Edge function search issue
Tests the edge function and logs detailed diagnostics
"""

import os
import time
import json
from dotenv import load_dotenv
import requests

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

print("\n" + "="*70)
print("DEBUG: Edge Function Search Issue")
print("="*70 + "\n")

edge_url = f"{SUPABASE_URL}/functions/v1/direct-navis"
headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

question = "What is bipolar androgen therapy?"
cancer_type = "Prostate"

print(f"Question: {question}")
print(f"Cancer Type: {cancer_type}\n")
print("Calling edge function...\n")

start_time = time.time()

response = requests.post(
    edge_url,
    headers=headers,
    json={
        'question': question,
        'cancerType': cancer_type,
        'directMode': False,
        'model': 'claude-3-5-sonnet'
    },
    timeout=120
)

elapsed = time.time() - start_time

print(f"Status code: {response.status_code}")
print(f"Elapsed time: {elapsed:.2f}s\n")

if response.status_code == 200:
    data = response.json()

    print("="*70)
    print("SEARCH DIAGNOSTICS")
    print("="*70)
    print(f"  Search method: {data.get('searchMethod', 'unknown')}")
    print(f"  Chunks used: {data.get('chunksUsed', 0)}")
    print(f"  Search latency: {data.get('searchLatencyMs', 0)}ms")
    print(f"  LLM latency: {data.get('llmLatencyMs', 0)}ms")

    chunks = data.get('retrievedChunks', [])
    print(f"\n  Retrieved chunks detail:")
    if chunks:
        for i, chunk in enumerate(chunks[:3], 1):
            print(f"    {i}. {chunk.get('guideline_title', 'N/A')[:60]}")
            print(f"       Similarity: {chunk.get('similarity', 'N/A')}")
    else:
        print("    ❌ NO CHUNKS RETRIEVED")
        print("\n  PROBLEM: Edge function is not getting chunks from match_chunks")
        print("  Possible causes:")
        print("    1. OpenAI API key not set in edge function secrets")
        print("    2. match_chunks RPC call failing silently")
        print("    3. Embedding generation failing")
        print("    4. Cancer type filter too restrictive")

    print("\n" + "="*70)
    print("ANSWER QUALITY")
    print("="*70)
    answer = data.get('answer', '')
    print(f"  Length: {len(answer)} chars")
    print(f"  Preview: {answer[:200]}...\n")

    print("="*70)
    print("EVAL SCORES ISSUE")
    print("="*70)

    # Check eval scores
    eval_data = data.get('evaluationScores', {})
    if eval_data:
        print(f"  Accuracy: {eval_data.get('accuracy', 'N/A')}")
        print(f"  Completeness: {eval_data.get('completeness', 'N/A')}")
        print(f"  Question Fit: {eval_data.get('questionFit', 'N/A')}")
        print(f"  Source Support: {eval_data.get('sourceSupport', 'N/A')}")
        print(f"  Trustworthiness: {eval_data.get('trustworthiness', 'N/A')}")
        print(f"  Communication: {eval_data.get('communication', 'N/A')}")
        print(f"  Overall Confidence: {eval_data.get('overallConfidence', 'N/A')}")
        print(f"  Confidence Level: {eval_data.get('confidenceLevel', 'N/A')}")

        overall = eval_data.get('overallConfidence', 0)
        if isinstance(overall, (int, float)):
            print(f"\n  Weighted Score: {overall:.2f} (scale 1-5)")
            print(f"  Thresholds: high >= 4.0, medium >= 3.0, low < 3.0")

            if overall >= 4.0:
                print(f"  ✓ Should show: HIGH")
            elif overall >= 3.0:
                print(f"  → Shows: MEDIUM (weighted score = {overall:.2f})")
            else:
                print(f"  ⚠ Shows: LOW")

            # Check if stuck at medium
            if 3.0 <= overall < 4.0:
                print(f"\n  💡 INSIGHT: Score is in 'medium' range ({overall:.2f})")
                print(f"     To get 'high', need score >= 4.0")
                print(f"     Current gap: {4.0 - overall:.2f} points")
                print(f"\n     Suggestions to improve:")
                if eval_data.get('sourceSupport', 0) < 5:
                    print(f"       - Improve source support (currently {eval_data.get('sourceSupport', 0)})")
                if eval_data.get('completeness', 0) < 5:
                    print(f"       - Improve completeness (currently {eval_data.get('completeness', 0)})")

    else:
        print("  ⚠️  No evaluation scores returned")

    print("\n" + "="*70)
    print("SUMMARY OF ISSUES")
    print("="*70)

    issues = []

    if data.get('chunksUsed', 0) == 0:
        issues.append("❌ NO CHUNKS RETRIEVED - Search is broken")
        issues.append("   Impact: Slow responses (20-30s), hallucinated citations")

    if elapsed > 15:
        issues.append(f"❌ HIGH LATENCY - {elapsed:.1f}s (target: <10s)")

    if eval_data.get('confidenceLevel') == 'medium':
        issues.append("⚠️  EVAL ALWAYS MEDIUM - Thresholds may need adjustment")
        issues.append(f"   Current score: {eval_data.get('overallConfidence', 0):.2f}, needs >= 4.0 for 'high'")

    if issues:
        for issue in issues:
            print(f"  {issue}")
    else:
        print("  ✓ No major issues detected")

else:
    print(f"❌ ERROR: {response.status_code}")
    print(f"Response: {response.text}")

print("\n" + "="*70 + "\n")
