#!/usr/bin/env python3
"""
Create guideline_documents table for PDF metadata
This is separate from the existing 'guidelines' table which stores chunks
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

print("\n" + "="*70)
print("CREATE GUIDELINE_DOCUMENTS TABLE")
print("="*70 + "\n")

# Create the table
sql = """
CREATE TABLE IF NOT EXISTS public.guideline_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  cancer_type TEXT,
  content_type TEXT NOT NULL,
  content_tier TEXT NOT NULL,
  file_path TEXT NOT NULL,
  storage_url TEXT,
  file_size BIGINT,
  page_count INTEGER,
  word_count INTEGER,
  speaker TEXT,
  webinar_number INTEGER,
  external_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_title_source_docs UNIQUE(title, source)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guideline_docs_title ON guideline_documents(title);
CREATE INDEX IF NOT EXISTS idx_guideline_docs_source ON guideline_documents(source);
CREATE INDEX IF NOT EXISTS idx_guideline_docs_cancer_type ON guideline_documents(cancer_type);
CREATE INDEX IF NOT EXISTS idx_guideline_docs_content_tier ON guideline_documents(content_tier);

-- Add guideline_document_id to guideline_chunks if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guideline_chunks' AND column_name = 'guideline_document_id'
  ) THEN
    ALTER TABLE guideline_chunks
    ADD COLUMN guideline_document_id UUID REFERENCES guideline_documents(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_chunks_guideline_doc_id ON guideline_chunks(guideline_document_id);
  END IF;
END $$;
"""

print("Creating guideline_documents table and adding link to guideline_chunks...")
print("(This may take a moment...)\n")

# We need to execute this via a proper SQL connection
# For now, let's just create the table structure via Python
import subprocess

# Write SQL to temp file
with open('/tmp/create_guideline_docs.sql', 'w') as f:
    f.write(sql)

print("SQL written to /tmp/create_guideline_docs.sql")
print("\nTo execute, run:")
print("  npx supabase db execute --file /tmp/create_guideline_docs.sql")
print("\nOr if you have psql with DATABASE_URL:")
print("  psql $DATABASE_URL < /tmp/create_guideline_docs.sql")
print("\n" + "="*70 + "\n")
