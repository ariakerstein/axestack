#!/usr/bin/env python3
"""
Create vector index by connecting directly to Postgres
This bypasses Supabase SQL Editor timeout limits
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Get database connection string from Supabase
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Extract project ref from URL
# https://felofmlhqwcdpiyjgstx.supabase.co -> felofmlhqwcdpiyjgstx
project_ref = SUPABASE_URL.replace('https://', '').split('.')[0]

# You need to get the database password from Supabase Dashboard
# Go to: Settings -> Database -> Connection string
print("=" * 60)
print("VECTOR INDEX CREATION")
print("=" * 60)
print(f"\nProject: {project_ref}")
print(f"\nTo create the vector index, you have two options:\n")

print("OPTION 1: Use Supabase Dashboard SQL Editor with smaller batches")
print("-" * 60)
print("""
Run these queries ONE AT A TIME (not all together):

Query 1:
SET maintenance_work_mem = '256MB';

Query 2:
DROP INDEX IF EXISTS idx_guideline_chunks_embedding;

Query 3 (this is the slow one - may take 1-2 minutes):
CREATE INDEX idx_guideline_chunks_embedding
ON guideline_chunks
USING ivfflat (chunk_embedding_vec vector_cosine_ops)
WITH (lists = 100);

Query 4:
RESET maintenance_work_mem;
""")

print("\nOPTION 2: Connect via psql or database client")
print("-" * 60)
print(f"""
1. Go to Supabase Dashboard -> Settings -> Database
2. Copy the "Connection string" (URI format)
3. Run: psql "your-connection-string"
4. Execute:

SET maintenance_work_mem = '256MB';
CREATE INDEX idx_guideline_chunks_embedding
ON guideline_chunks
USING ivfflat (chunk_embedding_vec vector_cosine_ops)
WITH (lists = 100);
""")

print("\nOPTION 3: Use HNSW index instead (faster to build, similar performance)")
print("-" * 60)
print("""
HNSW indexes are faster to create and may work within timeout:

CREATE INDEX idx_guideline_chunks_embedding
ON guideline_chunks
USING hnsw (chunk_embedding_vec vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
""")

print("\n" + "=" * 60)
print("After creating the index, test with:")
print("python test_rpc_direct.py")
print("=" * 60)
