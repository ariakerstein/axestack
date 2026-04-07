#!/usr/bin/env python3
"""
Deploy Storage Migration - Run SQL migration directly
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

def run_migration():
    """Run the storage migration SQL"""

    print("\n" + "="*70)
    print("DEPLOYING STORAGE MIGRATION")
    print("="*70 + "\n")

    # Read migration file
    migration_path = os.path.join(
        os.path.dirname(__file__),
        '..',
        'supabase',
        'migrations',
        '20251029000000_create_guidelines_storage.sql'
    )

    with open(migration_path, 'r') as f:
        sql = f.read()

    # Split into individual statements (rough split by semicolon)
    statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]

    print(f"Found {len(statements)} SQL statements to execute\n")

    success_count = 0
    error_count = 0

    for i, statement in enumerate(statements, 1):
        # Skip comments and empty statements
        if statement.startswith('--') or not statement.strip():
            continue

        print(f"[{i}/{len(statements)}] Executing statement...")

        try:
            # Execute via RPC
            result = supabase.rpc('exec_sql', {'sql': statement}).execute()
            success_count += 1
            print(f"  ✓ Success")
        except Exception as e:
            # Some errors are expected (e.g., "already exists")
            if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
                print(f"  ⚠ Skipped (already exists)")
                success_count += 1
            else:
                print(f"  ✗ Error: {str(e)[:100]}")
                error_count += 1

    print("\n" + "="*70)
    print(f"MIGRATION COMPLETE")
    print("="*70)
    print(f"Success: {success_count}")
    print(f"Errors: {error_count}")
    print("="*70 + "\n")

    # Verify bucket created
    print("Verifying storage bucket...")
    try:
        buckets = supabase.storage.list_buckets()
        guideline_bucket = [b for b in buckets if b['id'] == 'guideline-pdfs']
        if guideline_bucket:
            print("  ✓ Storage bucket 'guideline-pdfs' exists")
        else:
            print("  ⚠ Storage bucket not found - will create manually")
    except Exception as e:
        print(f"  ⚠ Could not verify: {e}")

    # Verify table created
    print("\nVerifying guidelines table...")
    try:
        result = supabase.table('guidelines').select('id').limit(1).execute()
        print("  ✓ Table 'guidelines' exists")
    except Exception as e:
        print(f"  ✗ Table not found: {e}")

    print("\nReady to upload PDFs!\n")

if __name__ == "__main__":
    run_migration()
