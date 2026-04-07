#!/usr/bin/env python3
"""Test a real semantic search query"""
import os
import time
from dotenv import load_dotenv
from supabase import create_client
import openai

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
openai.api_key = os.getenv('OPENAI_API_KEY')

print("=== REAL QUERY TEST ===\n")

# Test query - Bob Gatenby adaptive therapy
query = "Bob Gatenby adaptive therapy cancer"
print(f"Query: {query}\n")

# Generate embedding
print("Generating embedding...")
response = openai.embeddings.create(
    model="text-embedding-3-small",
    input=query
)
embedding = response.data[0].embedding
print(f"Embedding generated: {len(embedding)} dimensions\n")

# Run match_chunks
print("Running match_chunks...")
start_time = time.time()
result = supabase.rpc('match_chunks', {
    'query_embedding': embedding,
    'match_count': 10,
    'match_threshold': 0.35,
    'speaker_filter': None,
    'title_filter': None,
    'webinar_number_filter': None,
    'cancer_type_filter': None
}).execute()
elapsed = time.time() - start_time

print(f"Query completed in {elapsed:.2f} seconds")
print(f"Returned {len(result.data)} chunks:\n")

# Group by tier
tier_1_count = 0
tier_3_count = 0

for chunk in result.data:
    tier = chunk.get('content_tier', 'unknown')
    title = chunk.get('guideline_title', 'N/A')[:60]
    sim = chunk.get('similarity', 0)

    if tier == 'tier_1':
        tier_1_count += 1
        label = "NCCN"
    elif tier == 'tier_3':
        tier_3_count += 1
        label = "WEBINAR"
    else:
        label = tier.upper()

    print(f"  [{label}] {title}... (sim: {sim:.3f})")

print(f"\n=== SUMMARY ===")
print(f"NCCN (tier_1): {tier_1_count}")
print(f"Webinars (tier_3): {tier_3_count}")
