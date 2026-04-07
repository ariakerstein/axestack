#!/usr/bin/env python3
"""Apply the RPC fix migration to fix wrong Supabase project ID in URLs."""

import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment
# Supabase project: felofmlhqwcdpiyjgstx
PROJECT_ID = "felofmlhqwcdpiyjgstx"
DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD", "")

# Construct the DATABASE_URL if not set
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL and DB_PASSWORD:
    DATABASE_URL = f"postgresql://postgres.{PROJECT_ID}:{DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

if not DATABASE_URL:
    # Try to read from .env file directly
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    DATABASE_URL = line.split('=', 1)[1].strip().strip('"\'')
                    break
                elif line.startswith('SUPABASE_DB_PASSWORD='):
                    pwd = line.split('=', 1)[1].strip().strip('"\'')
                    DATABASE_URL = f"postgresql://postgres.{PROJECT_ID}:{pwd}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
                    break

SQL = '''
DROP FUNCTION IF EXISTS get_resources_by_cancer_type(TEXT, INT);

CREATE OR REPLACE FUNCTION get_resources_by_cancer_type(
  search_term TEXT,
  max_results INT DEFAULT 20
)
RETURNS TABLE (
  title TEXT,
  tier TEXT,
  source_url TEXT,
  cancer_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_storage_base TEXT := 'https://felofmlhqwcdpiyjgstx.supabase.co/storage/v1/object/public/guideline-pdfs/';
BEGIN
  RETURN QUERY
  WITH unique_resources AS (
    SELECT DISTINCT ON (gc.guideline_title)
      gc.guideline_title,
      gc.content_tier::TEXT,
      gc.url AS raw_url,
      gc.storage_path,
      gc.cancer_type
    FROM guideline_chunks gc
    WHERE
      gc.guideline_title IS NOT NULL
      AND gc.content_tier::TEXT IN ('tier_1', 'tier_2', 'tier_3')
      AND (
        gc.cancer_type ILIKE '%' || search_term || '%'
        OR gc.guideline_title ILIKE '%' || search_term || '%'
      )
    ORDER BY gc.guideline_title, gc.content_tier
  )
  SELECT
    ur.guideline_title AS title,
    ur.content_tier AS tier,
    -- Transform URL: handle localhost, relative paths, and external URLs
    CASE
      -- Already a valid external URL (NCCN, etc.)
      WHEN ur.raw_url LIKE 'https://www.nccn.org%' THEN ur.raw_url
      WHEN ur.raw_url LIKE 'https://%.pdf' THEN ur.raw_url
      -- Already a Supabase storage URL with correct project
      WHEN ur.raw_url LIKE '%felofmlhqwcdpiyjgstx.supabase.co/storage%' THEN ur.raw_url
      -- Fix URLs with wrong project ID
      WHEN ur.raw_url LIKE '%xobmvxatidcnbuwqptbe.supabase.co/storage%' THEN
        regexp_replace(ur.raw_url, 'xobmvxatidcnbuwqptbe', 'felofmlhqwcdpiyjgstx')
      -- Localhost URLs - extract path after port and convert to storage
      WHEN ur.raw_url LIKE 'http://localhost%' THEN
        supabase_storage_base || regexp_replace(ur.raw_url, '^http://localhost:[0-9]+/', '')
      -- Relative path starting with guidelines/, NCCN_general/, webinars/, nccn_pdfs/
      WHEN ur.raw_url LIKE 'guidelines/%' OR
           ur.raw_url LIKE 'NCCN_general/%' OR
           ur.raw_url LIKE 'webinars/%' OR
           ur.raw_url LIKE 'nccn_pdfs/%' THEN
        supabase_storage_base || ur.raw_url
      -- Fallback: try storage_path if available
      WHEN ur.storage_path IS NOT NULL AND ur.storage_path != '' THEN
        supabase_storage_base || ur.storage_path
      -- Last resort: return raw URL (may still be broken)
      ELSE ur.raw_url
    END AS source_url,
    ur.cancer_type
  FROM unique_resources ur
  ORDER BY
    CASE ur.content_tier
      WHEN 'tier_1' THEN 1
      WHEN 'tier_2' THEN 2
      WHEN 'tier_3' THEN 3
      ELSE 4
    END,
    ur.guideline_title
  LIMIT max_results;
END;
$$;

GRANT EXECUTE ON FUNCTION get_resources_by_cancer_type(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_resources_by_cancer_type(TEXT, INT) TO anon;
'''

def main():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not set and could not be constructed")
        print("Please set DATABASE_URL in your environment or .env file")
        print("Format: postgresql://postgres.<project-ref>:<password>@<host>:<port>/postgres")
        return False

    try:
        import psycopg2
    except ImportError:
        print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
        return False

    print(f"Connecting to database...")
    print(f"URL starts with: {DATABASE_URL[:50]}...")

    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()

        print("Applying RPC fix migration...")
        cur.execute(SQL)

        print("Migration applied successfully!")

        # Verify the fix
        print("\nVerifying fix by calling get_resources_by_cancer_type('lung', 1)...")
        cur.execute("SELECT * FROM get_resources_by_cancer_type('lung', 1)")
        result = cur.fetchone()

        if result:
            title, tier, url, cancer_type = result
            print(f"  Title: {title}")
            print(f"  URL: {url}")
            if 'felofmlhqwcdpiyjgstx' in url:
                print("  ✅ URL has correct project ID!")
            elif 'xobmvxatidcnbuwqptbe' in url:
                print("  ❌ URL still has wrong project ID!")
            else:
                print(f"  URL format: {url[:60]}...")
        else:
            print("  No results found for 'lung'")

        cur.close()
        conn.close()
        return True

    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    main()
