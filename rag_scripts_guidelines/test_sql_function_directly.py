#!/usr/bin/env python3
"""
Test if match_chunks SQL function works correctly
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

print("\n" + "="*70)
print("TEST SQL FUNCTION DIRECTLY")
print("="*70 + "\n")

# First, check if we have embeddings in the database
print("1. Checking if chunks with embeddings exist...")
try:
    result = supabase.table('guideline_chunks')\
        .select('id, guideline_title, cancer_type')\
        .not_.is_('chunk_embedding_vec', 'null')\
        .limit(5)\
        .execute()

    if result.data:
        print(f"   ✓ Found {len(result.data)} chunks with embeddings")
        for chunk in result.data:
            print(f"     - {chunk['guideline_title'][:50]}... ({chunk['cancer_type']})")
    else:
        print("   ❌ No chunks with embeddings found!")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Now test the match_chunks function
print("\n2. Testing match_chunks function...")
try:
    # Create a test embedding (all 0.1s - just for testing function exists)
    test_embedding = [0.1] * 1536

    result = supabase.rpc('match_chunks', {
        'query_embedding': test_embedding,
        'match_threshold': 0.5,
        'match_count': 3,
        'cancer_type_filter': 'Prostate'
    }).execute()

    if result.data and len(result.data) > 0:
        print(f"   ✓ Function works! Returned {len(result.data)} chunks")
        for i, chunk in enumerate(result.data, 1):
            print(f"     {i}. {chunk['guideline_title'][:50]}...")
            print(f"        Similarity: {chunk.get('similarity', 'N/A')}")
    else:
        print("   ⚠️  Function exists but returned 0 results")
        print("      (This might be normal - test embedding may not match real data)")

except Exception as e:
    error_str = str(e)
    print(f"   ❌ Function failed: {error_str[:200]}")

    if 'does not exist' in error_str or 'function' in error_str.lower():
        print("\n   → SQL function was NOT created successfully")
        print("   → Try pasting the SQL again")
    elif 'column' in error_str.lower():
        print("\n   → SQL function has wrong column names")
        print("   → Need to fix the function definition")

print("\n" + "="*70)
print("NEXT STEP")
print("="*70)
print("\nIf function doesn't work, I'll create a simpler version")
print("that matches your exact table schema.\n")
