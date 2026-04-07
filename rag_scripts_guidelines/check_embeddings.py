#!/usr/bin/env python3
"""Check embedding status"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

print("=== EMBEDDING STATUS CHECK ===\n")

# Check total chunks
result = supabase.table('guideline_chunks').select('id', count='exact').execute()
print(f"Total chunks: {result.count}")

# Check active chunks
result = supabase.table('guideline_chunks').select('id', count='exact').eq('status', 'active').execute()
print(f"Active chunks: {result.count}")

# Check chunks with embeddings (non-null)
result = supabase.table('guideline_chunks').select('id', count='exact').not_.is_('chunk_embedding_vec', 'null').execute()
print(f"Chunks with embeddings: {result.count}")

# Check by tier
print("\n=== By content tier ===")
for tier in ['tier_1', 'tier_3']:
    total = supabase.table('guideline_chunks').select('id', count='exact').eq('content_tier', tier).execute()
    with_emb = supabase.table('guideline_chunks').select('id', count='exact').eq('content_tier', tier).not_.is_('chunk_embedding_vec', 'null').execute()
    print(f"{tier}: {with_emb.count}/{total.count} have embeddings")
