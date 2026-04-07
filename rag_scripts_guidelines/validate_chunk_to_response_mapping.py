#!/usr/bin/env python3
"""
CHUNK → RESPONSE AUDIT TRAIL
Validates that retrieved chunks are being used correctly in responses
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
print("CHUNK → RESPONSE AUDIT TRAIL")
print("="*70 + "\n")

# Test question
test_question = "What is bipolar androgen therapy?"
test_cancer_type = "Prostate"

print(f"Question: {test_question}")
print(f"Cancer Type: {test_cancer_type}\n")

edge_url = f"{SUPABASE_URL}/functions/v1/direct-navis"
headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

print("Calling edge function...\n")
start = time.time()

response = requests.post(
    edge_url,
    headers=headers,
    json={
        'question': test_question,
        'cancerType': test_cancer_type,
        'directMode': False,
        'model': 'claude-3-5-sonnet'
    },
    timeout=120
)

elapsed = time.time() - start

if response.status_code != 200:
    print(f"❌ Error: HTTP {response.status_code}")
    print(response.text[:500])
    exit(1)

data = response.json()

print("="*70)
print("RESPONSE METADATA")
print("="*70)
print(f"  Total latency: {elapsed:.2f}s")
print(f"  Search method: {data.get('searchMethod', 'unknown')}")
print(f"  Chunks used: {data.get('chunksUsed', 0)}")
print(f"  Search latency: {data.get('searchLatencyMs', 0)}ms")
print(f"  LLM latency: {data.get('llmLatencyMs', 0)}ms")
print()

# Extract retrieved chunks
retrieved_chunks = data.get('retrievedChunks', [])

if not retrieved_chunks or len(retrieved_chunks) == 0:
    print("="*70)
    print("❌ CRITICAL: NO CHUNKS RETRIEVED")
    print("="*70)
    print("This means:")
    print("  1. Search is BROKEN (semantic or text)")
    print("  2. Claude is answering WITHOUT your guideline data")
    print("  3. Responses will be SLOW and potentially INACCURATE")
    print("\nDiagnosis:")
    if data.get('searchMethod') == 'unknown':
        print("  → Search method is 'unknown' = no search attempted")
        print("  → Likely cause: match_chunks SQL function missing OR broken")
    else:
        print(f"  → Search method: {data.get('searchMethod')}")
        print("  → Search attempted but returned 0 results")
    print("\n✓ FIXED SQL is ready - paste into Supabase dashboard")
    print("  https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new")
    exit(1)

print("="*70)
print(f"RETRIEVED CHUNKS ({len(retrieved_chunks)})")
print("="*70 + "\n")

for i, chunk in enumerate(retrieved_chunks, 1):
    print(f"[Chunk {i}]")
    print(f"  ID: {chunk.get('id', 'N/A')}")
    print(f"  Title: {chunk.get('guideline_title', 'N/A')}")
    print(f"  Source: {chunk.get('guideline_source', 'N/A')}")
    print(f"  Cancer Type: {chunk.get('cancer_type', 'N/A')}")
    print(f"  Chunk Index: {chunk.get('chunk_index', 'N/A')}")

    # Show chunk text preview
    chunk_text = chunk.get('chunk_text', '')
    preview = chunk_text[:200] if chunk_text else 'N/A'
    print(f"  Text Preview: {preview}...")

    # Show similarity if available
    similarity = chunk.get('similarity')
    if similarity is not None:
        print(f"  Similarity Score: {similarity:.3f}")

    print()

# Extract answer
answer = data.get('answer', '')
answer_preview = answer[:500] if answer else 'N/A'

print("="*70)
print("GENERATED ANSWER")
print("="*70)
print(answer_preview)
if len(answer) > 500:
    print(f"\n... ({len(answer) - 500} more characters)")
print()

# Validation: Check if chunk content appears in answer
print("="*70)
print("CHUNK → ANSWER VALIDATION")
print("="*70 + "\n")

answer_lower = answer.lower()
chunks_found_in_answer = 0

for i, chunk in enumerate(retrieved_chunks, 1):
    chunk_text = chunk.get('chunk_text', '')
    guideline_title = chunk.get('guideline_title', 'Unknown')

    # Extract key phrases from chunk (first 100 chars, split into words)
    if chunk_text:
        words = chunk_text[:100].lower().split()
        # Look for 3+ word phrases from chunk in answer
        found_phrases = []
        for j in range(len(words) - 2):
            phrase = ' '.join(words[j:j+3])
            if len(phrase) > 10 and phrase in answer_lower:
                found_phrases.append(phrase)

        if found_phrases:
            chunks_found_in_answer += 1
            print(f"✓ Chunk {i} ({guideline_title[:40]}...)")
            print(f"  Found {len(found_phrases)} matching phrases in answer")
            print(f"  Example: '{found_phrases[0][:60]}...'")
        else:
            print(f"⚠ Chunk {i} ({guideline_title[:40]}...)")
            print(f"  No direct text matches found in answer")
    print()

print("="*70)
print("VALIDATION SUMMARY")
print("="*70)

match_rate = (chunks_found_in_answer / len(retrieved_chunks)) * 100 if retrieved_chunks else 0

print(f"  Chunks retrieved: {len(retrieved_chunks)}")
print(f"  Chunks with content in answer: {chunks_found_in_answer}")
print(f"  Match rate: {match_rate:.0f}%")
print()

if match_rate >= 80:
    print("✓ EXCELLENT: Chunks are being used effectively")
elif match_rate >= 50:
    print("⚠ MODERATE: Some chunks used, but could be better")
else:
    print("❌ POOR: Chunks not being used effectively")
    print("   → Claude may be relying on general knowledge instead")

print("\n" + "="*70)

# Save full audit trail
audit_file = f'chunk_audit_{int(time.time())}.json'
with open(audit_file, 'w') as f:
    json.dump({
        'question': test_question,
        'cancer_type': test_cancer_type,
        'latency_seconds': elapsed,
        'search_method': data.get('searchMethod'),
        'chunks_used': len(retrieved_chunks),
        'retrieved_chunks': retrieved_chunks,
        'answer': answer,
        'validation': {
            'chunks_found_in_answer': chunks_found_in_answer,
            'match_rate_pct': match_rate
        }
    }, f, indent=2)

print(f"\n✓ Full audit trail saved to: {audit_file}\n")
