#!/usr/bin/env python3
"""Test if the vector index is working by running a direct similarity search"""
import os
import time
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

print("=== VECTOR INDEX TEST ===\n")

# Test 1: Get a sample embedding
print("Step 1: Getting a sample embedding from an active chunk...")
result = supabase.table('guideline_chunks').select('id, chunk_embedding_vec').eq('status', 'active').not_.is_('chunk_embedding_vec', 'null').limit(1).execute()

if not result.data:
    print("ERROR: No chunks with embeddings found!")
    exit(1)

sample_id = result.data[0]['id']
sample_embedding = result.data[0]['chunk_embedding_vec']
print(f"Got embedding from chunk ID: {sample_id}")
print(f"Embedding length: {len(sample_embedding)} dimensions\n")

# Test 2: Run match_chunks with the sample embedding
print("Step 2: Testing match_chunks RPC...")
start_time = time.time()
try:
    result = supabase.rpc('match_chunks', {
        'query_embedding': sample_embedding,
        'match_count': 5,
        'match_threshold': 0.3,
        'speaker_filter': None,
        'title_filter': None,
        'webinar_number_filter': None,
        'cancer_type_filter': None
    }).execute()
    elapsed = time.time() - start_time

    print(f"SUCCESS! Query completed in {elapsed:.2f} seconds")
    print(f"Returned {len(result.data)} chunks:\n")
    for chunk in result.data:
        print(f"  - {chunk.get('guideline_title', 'N/A')[:50]}... (similarity: {chunk.get('similarity', 'N/A'):.3f})")
except Exception as e:
    elapsed = time.time() - start_time
    print(f"FAILED after {elapsed:.2f} seconds")
    print(f"Error: {e}")

print("\n" + "=" * 50)
