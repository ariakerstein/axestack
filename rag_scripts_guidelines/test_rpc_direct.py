#!/usr/bin/env python3
"""Test match_chunks RPC directly"""
import os
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Generate embedding
query = "metastatic prostate cancer treatment options"
print(f"Query: {query}")
print("Generating embedding...")
response = openai_client.embeddings.create(
    model='text-embedding-3-small',
    input=query,
    dimensions=1536
)
embedding = response.data[0].embedding
print(f"Embedding generated: {len(embedding)} dimensions")

# Test with NO cancer type filter
print("\n=== Test 1: No cancer type filter ===")
try:
    result = supabase.rpc('match_chunks', {
        'query_embedding': embedding,
        'match_threshold': 0.10,
        'match_count': 20,
        'cancer_type_filter': None,
        'speaker_filter': None,
        'webinar_number_filter': None,
        'title_filter': None
    }).execute()

    tier_counts = {}
    for r in result.data:
        tier = r.get('content_tier', 'unknown')
        tier_counts[tier] = tier_counts.get(tier, 0) + 1

    print(f"Returned {len(result.data)} chunks")
    print(f"By tier: {tier_counts}")
except Exception as e:
    print(f"Error: {e}")

# Test WITH prostate cancer type filter
print("\n=== Test 2: With 'prostate' cancer type filter ===")
try:
    result = supabase.rpc('match_chunks', {
        'query_embedding': embedding,
        'match_threshold': 0.10,
        'match_count': 20,
        'cancer_type_filter': 'prostate',
        'speaker_filter': None,
        'webinar_number_filter': None,
        'title_filter': None
    }).execute()

    tier_counts = {}
    for r in result.data:
        tier = r.get('content_tier', 'unknown')
        tier_counts[tier] = tier_counts.get(tier, 0) + 1

    print(f"Returned {len(result.data)} chunks")
    print(f"By tier: {tier_counts}")

    # Show samples
    print("\nSample results:")
    for r in result.data[:5]:
        print(f"  [{r.get('content_tier')}] {r.get('guideline_title', 'No title')[:50]}... (sim: {r.get('similarity', 0):.3f})")
except Exception as e:
    print(f"Error: {e}")
