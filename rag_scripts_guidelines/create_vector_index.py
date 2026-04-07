#!/usr/bin/env python3
"""Create vector index on guideline_chunks"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

# Execute raw SQL to create the index
sql = """
-- Drop existing index if exists
DROP INDEX IF EXISTS idx_guideline_chunks_embedding;

-- Create IVFFlat index for cosine similarity
CREATE INDEX idx_guideline_chunks_embedding
ON guideline_chunks
USING ivfflat (chunk_embedding_vec vector_cosine_ops)
WITH (lists = 100);
"""

print("Creating vector index on guideline_chunks...")
print("This may take a minute with 17K+ vectors...")

try:
    result = supabase.rpc('exec_sql', {'sql': sql}).execute()
    print("Index created successfully!")
except Exception as e:
    print(f"RPC error (expected - rpc may not exist): {e}")
    print("\nPlease run this SQL directly in Supabase SQL Editor:")
    print(sql)
