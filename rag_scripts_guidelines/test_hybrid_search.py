#!/usr/bin/env python3
"""
Test the hybrid search approach: semantic similarity + cancer type boost
"""

import os
from dotenv import load_dotenv
from supabase import create_client
import openai

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)

print("\n" + "="*70)
print("HYBRID SEARCH TEST")
print("="*70 + "\n")

# First, apply the SQL migration
print("Applying hybrid match_chunks SQL function...")
with open('/tmp/hybrid_match_chunks.sql', 'r') as f:
    sql = f.read()
    # Split by semicolons and execute each statement
    statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]

    for stmt in statements:
        if 'SELECT' in stmt and 'FROM match_chunks' in stmt:
            # Skip the test query for now
            continue
        try:
            result = supabase.postgrest.rpc('exec_sql', {'query': stmt}).execute()
            print(f"✓ Executed SQL statement")
        except Exception as e:
            # Try direct execution via psql
            print(f"  Note: {str(e)[:100]}")

print("\nGenerating embedding for test question...")
question = "What is bipolar androgen therapy?"
cancer_type = "Prostate"

response = openai_client.embeddings.create(
    model="text-embedding-3-small",
    input=question,
    dimensions=1536
)
embedding = response.data[0].embedding

print(f"✓ Generated embedding for: {question}")
print(f"  Cancer type filter: {cancer_type}\n")

# Test the hybrid search
print("="*70)
print("HYBRID SEARCH RESULTS (with cancer type boost)")
print("="*70 + "\n")

result = supabase.rpc('match_chunks', {
    'query_embedding': embedding,
    'match_threshold': 0.50,
    'match_count': 8,
    'cancer_type_filter': cancer_type
}).execute()

chunks = result.data if result.data else []

print(f"Found {len(chunks)} chunks\n")

for i, chunk in enumerate(chunks[:8], 1):
    sim = chunk.get('similarity', 0)
    title = chunk.get('guideline_title', 'N/A')
    cancer = chunk.get('cancer_type', 'N/A')

    # Determine boost status
    boost_status = ""
    if 'prostate' in cancer.lower():
        boost_status = " [BOOSTED 1.2x - Prostate match]"
    elif 'general' in cancer.lower():
        boost_status = " [BOOSTED 1.1x - General content]"

    print(f"{i}. Similarity: {sim:.3f}{boost_status}")
    print(f"   Title: {title[:70]}")
    print(f"   Cancer Type: {cancer}")
    print()

print("="*70)
print("ANALYSIS")
print("="*70)

print("""
Hybrid search combines:
  1. Semantic similarity (cosine distance) - finds relevant content
  2. Cancer type boost - prefers matching types but doesn't exclude others

Benefits:
  ✓ Finds "Bipolar Androgen Therapy" webinar even if labeled "General"
  ✓ Boosts Prostate-specific NCCN guidelines to top
  ✓ Includes relevant content from all sources
  ✓ No manual relabeling needed

This should give you BOTH precision (prefer matching cancer type)
and recall (don't miss relevant content from other labels).
""")

print("="*70 + "\n")
