#!/usr/bin/env python3
"""Check vector index status and embedding format"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

print("=== INDEX STATUS CHECK ===\n")

# Check indexes - need to run SQL directly in dashboard
print("To check indexes, run this SQL in Supabase SQL Editor:")
print("""
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'guideline_chunks'
AND indexname LIKE '%embedding%';
""")

# Check sample embedding type
print("\nChecking embedding data type...")
result = supabase.table('guideline_chunks').select('id, chunk_embedding_vec').eq('status', 'active').not_.is_('chunk_embedding_vec', 'null').limit(1).execute()
if result.data:
    emb = result.data[0]['chunk_embedding_vec']
    print(f"Embedding type: {type(emb)}")
    if isinstance(emb, str):
        # It's stored as a string, parse it
        emb_str = emb.strip('[]')
        values = emb_str.split(',')
        print(f"String length: {len(emb)}")
        print(f"Number of values when split: {len(values)}")
        print(f"First few values: {values[:5]}")
    elif isinstance(emb, list):
        print(f"List length: {len(emb)}")
        print(f"First few values: {emb[:5]}")
    else:
        print(f"Unexpected type: {type(emb)}")
        print(f"Value preview: {str(emb)[:200]}")
