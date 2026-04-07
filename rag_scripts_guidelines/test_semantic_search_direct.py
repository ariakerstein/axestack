#!/usr/bin/env python3
"""
Direct test of semantic search to diagnose why edge function uses text search
"""

import os
import time
from dotenv import load_dotenv
from supabase import create_client
import openai

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

print("\n" + "="*70)
print("DIRECT SEMANTIC SEARCH TEST")
print("="*70 + "\n")

# Initialize clients
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)

question = "What is bipolar androgen therapy?"
cancer_type = "Prostate"

print(f"Question: {question}")
print(f"Cancer Type: {cancer_type}\n")

# Step 1: Generate embedding
print("="*70)
print("STEP 1: Generate OpenAI Embedding")
print("="*70)

try:
    start = time.time()
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=question,
        dimensions=1536
    )
    embedding_time = time.time() - start

    embedding = response.data[0].embedding
    print(f"✓ Generated embedding in {embedding_time*1000:.0f}ms")
    print(f"  Dimensions: {len(embedding)}")
    print(f"  First 5 values: {[round(v, 4) for v in embedding[:5]]}")

except Exception as e:
    print(f"❌ ERROR generating embedding: {e}")
    exit(1)

# Step 2: Call match_chunks with different thresholds
print("\n" + "="*70)
print("STEP 2: Test match_chunks with Different Thresholds")
print("="*70 + "\n")

thresholds = [0.65, 0.60, 0.55, 0.50, 0.40]

for threshold in thresholds:
    print(f"Testing threshold: {threshold}")

    try:
        start = time.time()
        result = supabase.rpc('match_chunks', {
            'query_embedding': embedding,
            'match_threshold': threshold,
            'match_count': 8,
            'cancer_type_filter': cancer_type
        }).execute()
        rpc_time = time.time() - start

        chunks = result.data if result.data else []
        print(f"  Time: {rpc_time*1000:.0f}ms")
        print(f"  Results: {len(chunks)} chunks")

        if chunks:
            print(f"  Top 3 similarities:")
            for i, chunk in enumerate(chunks[:3], 1):
                sim = chunk.get('similarity', 0)
                title = chunk.get('guideline_title', 'N/A')[:50]
                cancer = chunk.get('cancer_type', 'N/A')
                print(f"    {i}. [{sim:.3f}] {title}... (cancer: {cancer})")
            print(f"  ✓ SUCCESS - Would use semantic search with threshold {threshold}")
            break
        else:
            print(f"  ⚠️  No results at threshold {threshold}")

    except Exception as e:
        print(f"  ❌ ERROR: {e}")

# Step 3: Test without cancer type filter
print("\n" + "="*70)
print("STEP 3: Test WITHOUT Cancer Type Filter (threshold 0.50)")
print("="*70 + "\n")

try:
    start = time.time()
    result = supabase.rpc('match_chunks', {
        'query_embedding': embedding,
        'match_threshold': 0.50,
        'match_count': 8,
        'cancer_type_filter': None  # No filter
    }).execute()
    rpc_time = time.time() - start

    chunks = result.data if result.data else []
    print(f"Time: {rpc_time*1000:.0f}ms")
    print(f"Results: {len(chunks)} chunks\n")

    if chunks:
        print("Top 5 results:")
        for i, chunk in enumerate(chunks[:5], 1):
            sim = chunk.get('similarity', 0)
            title = chunk.get('guideline_title', 'N/A')[:50]
            cancer = chunk.get('cancer_type', 'N/A')
            print(f"  {i}. [{sim:.3f}] {title}... (cancer: {cancer})")
    else:
        print("❌ CRITICAL: Even with NO filter, no chunks returned!")
        print("   This means match_chunks function is broken or no chunks have embeddings")

except Exception as e:
    print(f"❌ ERROR: {e}")

# Step 4: Check if chunks exist with embeddings
print("\n" + "="*70)
print("STEP 4: Check Database for Chunks with Embeddings")
print("="*70 + "\n")

try:
    result = supabase.table('guideline_chunks')\
        .select('cancer_type, count', count='exact')\
        .not_.is_('chunk_embedding_vec', 'null')\
        .execute()

    total_with_embeddings = result.count
    print(f"Total chunks with embeddings: {total_with_embeddings}")

    # Check Prostate specifically
    result = supabase.table('guideline_chunks')\
        .select('id, guideline_title, cancer_type', count='exact')\
        .ilike('cancer_type', '%Prostate%')\
        .not_.is_('chunk_embedding_vec', 'null')\
        .limit(5)\
        .execute()

    print(f"Prostate chunks with embeddings: {result.count}")
    if result.data:
        print(f"Sample Prostate chunks:")
        for chunk in result.data[:5]:
            print(f"  - {chunk.get('guideline_title', 'N/A')[:60]}")

except Exception as e:
    print(f"❌ ERROR: {e}")

print("\n" + "="*70)
print("DIAGNOSIS")
print("="*70)

print("""
If semantic search is not working in edge function, possible causes:

1. ❌ OPENAI_API_KEY not set in Supabase edge function secrets
   → Go to: https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/settings/functions
   → Add secret: OPENAI_API_KEY

2. ❌ Threshold too high (0.65) - no chunks meet minimum similarity
   → Lower threshold to 0.50 or 0.55 in edge function

3. ❌ Cancer type filter too restrictive
   → Check cancer_type values in database vs. what's being passed

4. ❌ Edge function failing silently and falling back to text search
   → Check edge function logs in Supabase dashboard

Run this script output should help identify which issue it is.
""")

print("="*70 + "\n")
