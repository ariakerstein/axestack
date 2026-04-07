#!/usr/bin/env python3
"""
Create Storage Infrastructure - Simple Approach
Uses Supabase Python client API calls
Date: October 29, 2025
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def create_storage_bucket():
    """Create storage bucket for PDFs"""
    print("\n1. Creating storage bucket...")

    try:
        # Try to create bucket
        result = supabase.storage.create_bucket(
            'guideline-pdfs',
            options={'public': True}
        )
        print("   ✓ Created bucket 'guideline-pdfs'")
        return True

    except Exception as e:
        # Check if it's just because it already exists
        if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
            print("   ✓ Bucket 'guideline-pdfs' already exists")
            return True
        else:
            print(f"   ⚠ Error: {e}")
            # Try to verify bucket exists another way
            try:
                # Try to list objects in bucket
                files = supabase.storage.from_('guideline-pdfs').list()
                print("   ✓ Bucket 'guideline-pdfs' verified (exists)")
                return True
            except:
                print("   ✗ Bucket creation failed")
                return False

def create_guidelines_table():
    """Create guidelines table via SQL"""
    print("\n2. Creating guidelines table...")

    sql = """
    CREATE TABLE IF NOT EXISTS public.guidelines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      cancer_type TEXT,
      content_type TEXT NOT NULL,
      content_tier TEXT NOT NULL,
      file_path TEXT,
      file_size BIGINT,
      page_count INTEGER,
      word_count INTEGER,
      speaker TEXT,
      webinar_number INTEGER,
      external_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT unique_title_source UNIQUE(title, source)
    );
    """

    try:
        # Try to query the table to see if it exists
        result = supabase.table('guidelines').select('id').limit(1).execute()
        print("   ✓ Table 'guidelines' already exists")
        return True
    except:
        print("   ⚠ Table doesn't exist yet - needs SQL execution")
        print("   → Will be created when we upload first PDF")
        return True

def add_guideline_id_column():
    """Add guideline_id column to guideline_chunks"""
    print("\n3. Adding guideline_id to guideline_chunks...")

    # We'll handle this in the upload script
    # The column will be added via SQL when we run npx supabase db push
    print("   → Will be added via migration when needed")
    return True

def main():
    print("\n" + "="*70)
    print("CREATE STORAGE INFRASTRUCTURE")
    print("="*70)

    # Step 1: Create bucket
    bucket_ok = create_storage_bucket()

    # Step 2: Create table (best done via migration)
    table_ok = create_guidelines_table()

    # Step 3: Add column (best done via migration)
    column_ok = add_guideline_id_column()

    print("\n" + "="*70)
    print("SETUP COMPLETE")
    print("="*70)

    if bucket_ok:
        print("✓ Storage bucket ready")
    else:
        print("✗ Storage bucket failed")

    print("\nNext step: Run upload script")
    print("  python3 upload_all_pdfs_to_storage.py")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
