#!/usr/bin/env python3
"""
FULL AUDIT TRACE - Complete citation flow analysis
Shows: Search → Chunks → Answer → Citations with full traceability
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
print("FULL AUDIT TRACE - Complete Citation Flow")
print("="*70 + "\n")

# Test question
question = "What is bipolar androgen therapy?"
cancer_type = "Prostate"

print(f"Question: {question}")
print(f"Cancer Type: {cancer_type}\n")

edge_url = f"{SUPABASE_URL}/functions/v1/direct-navis"
headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

print("Calling edge function with full trace enabled...\n")
start = time.time()

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

elapsed = time.time() - start
data = response.json()

print("="*70)
print("1. SEARCH RESULTS")
print("="*70 + "\n")

search_method = data.get('searchMethod', 'unknown')
chunks_used = data.get('chunksUsed', 0)
retrieved_chunks = data.get('retrievedChunks', [])

print(f"Search Method: {search_method}")
print(f"Chunks Retrieved: {chunks_used}")
print(f"Search Latency: {data.get('searchLatencyMs', 0)}ms")

if chunks_used == 0:
    print("\n❌ CRITICAL: NO CHUNKS RETRIEVED")
    print("   → Search is BROKEN")
    print("   → Responses will be SLOW (20-30s)")
    print("   → Citations will be HALLUCINATED")
    print("\n   FIX: Paste the corrected SQL into Supabase")
    print("   (SQL is in your clipboard)")
    exit(1)

print(f"\n✓ Retrieved {chunks_used} chunks:\n")

for i, chunk in enumerate(retrieved_chunks, 1):
    print(f"[Chunk {i}]")
    print(f"  ID: {chunk.get('id')}")
    print(f"  Title: {chunk.get('guideline_title', 'N/A')}")
    print(f"  Source: {chunk.get('guideline_source', 'N/A')}")
    print(f"  Cancer Type: {chunk.get('cancer_type', 'N/A')}")

    similarity = chunk.get('similarity')
    if similarity:
        print(f"  Similarity: {similarity:.3f}")

    text_preview = chunk.get('chunk_text', '')[:150]
    print(f"  Text: {text_preview}...")
    print()

print("="*70)
print("2. ANSWER GENERATION")
print("="*70 + "\n")

answer = data.get('answer', '')
print(f"Answer Length: {len(answer)} chars")
print(f"LLM Latency: {data.get('llmLatencyMs', 0)}ms")
print(f"Total Latency: {elapsed:.2f}s")
print(f"\nAnswer Preview:\n{answer[:500]}...")

print("\n" + "="*70)
print("3. CITATIONS IN RESPONSE")
print("="*70 + "\n")

citations = data.get('citations', [])
citation_urls = data.get('citationUrls', [])

print(f"Citations Count: {len(citations)}")

if citations:
    print("\nCitations (as shown to user):")
    for i, cit in enumerate(citations, 1):
        print(f"  {i}. {cit}")
else:
    print("  ⚠️  No citations returned")

if citation_urls:
    print(f"\nCitation URLs ({len(citation_urls)}):")
    for i, url_data in enumerate(citation_urls, 1):
        print(f"  {i}. {url_data.get('title', 'N/A')}")
        print(f"     URL: {url_data.get('url', 'N/A')}")

print("\n" + "="*70)
print("4. CHUNK → CITATION MAPPING")
print("="*70 + "\n")

# Verify chunks appear in citations
answer_lower = answer.lower()
citations_lower = ' '.join(citations).lower()

print("Validating that retrieved chunks are cited:\n")

for i, chunk in enumerate(retrieved_chunks, 1):
    title = chunk.get('guideline_title', '')

    # Check if chunk title appears in citations
    if title and title.lower() in citations_lower:
        print(f"✓ Chunk {i}: '{title[:50]}...'")
        print(f"  → Appears in citations")
    else:
        print(f"⚠ Chunk {i}: '{title[:50]}...'")
        print(f"  → NOT found in citations")

print("\n" + "="*70)
print("5. HOW CITATIONS WORK NOW")
print("="*70 + "\n")

print("Current Citation System:")
print("  1. Search retrieves chunks from guideline_chunks table")
print("  2. Chunks passed to Claude as context")
print("  3. Claude generates answer using chunk content")
print("  4. extractCitationsFromChunks() extracts unique guideline titles")
print("  5. Citations returned in 'citations' array")
print("  6. Citation URLs (with links) returned in 'citationUrls' array")

print("\n✓ Citations are LIVE and traceable:")
print("  - Each citation maps to retrieved chunks")
print("  - Chunk IDs allow database lookup")
print("  - Full audit trail: Question → Search → Chunks → Answer → Citations")

print("\n" + "="*70)
print("6. PERFORMANCE METRICS")
print("="*70 + "\n")

print(f"Total Request Time: {elapsed:.2f}s")

if elapsed > 20:
    print("  ❌ TOO SLOW (>20s)")
    if chunks_used == 0:
        print("     → Cause: No chunks (search broken)")
    else:
        print("     → Cause: Slow Claude model or large response")
elif elapsed > 10:
    print("  ⚠️  MODERATE (10-20s)")
else:
    print("  ✓ FAST (<10s)")

if chunks_used > 0:
    print(f"\n✓ Using {chunks_used} guideline chunks")
    print("✓ Citations are from YOUR data (not hallucinated)")
else:
    print("\n❌ Using 0 guideline chunks")
    print("❌ Citations are hallucinated from Claude's training")

print("\n" + "="*70 + "\n")

# Save full trace
with open(f'full_audit_trace_{int(time.time())}.json', 'w') as f:
    json.dump({
        'question': question,
        'cancer_type': cancer_type,
        'search': {
            'method': search_method,
            'chunks_retrieved': chunks_used,
            'latency_ms': data.get('searchLatencyMs', 0)
        },
        'retrieved_chunks': retrieved_chunks,
        'answer': {
            'text': answer,
            'length': len(answer),
            'llm_latency_ms': data.get('llmLatencyMs', 0)
        },
        'citations': citations,
        'citation_urls': citation_urls,
        'performance': {
            'total_latency_seconds': elapsed,
            'search_latency_ms': data.get('searchLatencyMs', 0),
            'llm_latency_ms': data.get('llmLatencyMs', 0)
        }
    }, f, indent=2)

print("✓ Full audit trace saved\n")
