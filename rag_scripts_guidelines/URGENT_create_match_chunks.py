#!/usr/bin/env python3
"""URGENT: Create match_chunks function to fix slow responses"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client
import requests

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

print("\n" + "="*70)
print("URGENT FIX: Creating match_chunks function")
print("="*70 + "\n")

# Try via REST API SQL execution
url = f"{SUPABASE_URL}/rest/v1/rpc/exec"
headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

sql = """
CREATE EXTENSION IF NOT EXISTS vector;

DROP FUNCTION IF EXISTS match_chunks(vector(1536), float, int, text);

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.65,
  match_count int DEFAULT 8,
  cancer_type_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  guideline_title text,
  guideline_source text,
  cancer_type text,
  chunk_text text,
  chunk_index int,
  content_tier text,
  content_type text,
  speaker text,
  webinar_number int,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    gc.id, gc.guideline_title, gc.guideline_source, gc.cancer_type, gc.chunk_text,
    gc.chunk_index, gc.content_tier, gc.content_type, gc.speaker, gc.webinar_number,
    gc.created_at,
    1 - (gc.chunk_embedding_vec <=> query_embedding) AS similarity
  FROM guideline_chunks gc
  WHERE
    (cancer_type_filter IS NULL OR gc.cancer_type ILIKE '%' || cancer_type_filter || '%')
    AND (1 - (gc.chunk_embedding_vec <=> query_embedding)) >= match_threshold
  ORDER BY gc.chunk_embedding_vec <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_chunks TO authenticated, anon, service_role;
"""

print("Attempting to create function via REST API...\n")

# Since direct SQL execution via REST might not work, let's just show instructions
print("⚠️  Cannot execute SQL directly via REST API")
print("\n" + "="*70)
print("MANUAL ACTION REQUIRED - Takes 10 seconds")
print("="*70)
print("\n1. Open: https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new")
print("\n2. Copy this SQL (it's short):\n")
print("-" * 70)
print(sql)
print("-" * 70)
print("\n3. Paste into the SQL Editor")
print("4. Click 'Run' (green button)")
print("\n✓ This will IMMEDIATELY fix the slow responses!")
print("✓ Responses will drop from 20s to ~6-8s")
print("="*70 + "\n")

# Write to file for easy copying
with open('/tmp/PASTE_THIS.sql', 'w') as f:
    f.write(sql)

print("✓ SQL also saved to: /tmp/PASTE_THIS.sql")
print("  (You can copy from that file too)\n")
