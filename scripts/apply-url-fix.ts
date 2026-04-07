import * as dotenv from 'dotenv';
dotenv.config();

// Use the Supabase Management API to run SQL
async function applyMigration() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const projectId = process.env.VITE_SUPABASE_PROJECT_ID || 'felofmlhqwcdpiyjgstx';

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // The SQL to apply
  const sql = `
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
    CASE
      WHEN ur.raw_url LIKE 'https://www.nccn.org%' THEN ur.raw_url
      WHEN ur.raw_url LIKE 'https://%.pdf' THEN ur.raw_url
      WHEN ur.raw_url LIKE '%felofmlhqwcdpiyjgstx.supabase.co/storage%' THEN ur.raw_url
      WHEN ur.raw_url LIKE '%xobmvxatidcnbuwqptbe.supabase.co/storage%' THEN
        regexp_replace(ur.raw_url, 'xobmvxatidcnbuwqptbe', 'felofmlhqwcdpiyjgstx')
      WHEN ur.raw_url LIKE 'http://localhost%' THEN
        supabase_storage_base || regexp_replace(ur.raw_url, '^http://localhost:[0-9]+/', '')
      WHEN ur.raw_url LIKE 'guidelines/%' OR
           ur.raw_url LIKE 'NCCN_general/%' OR
           ur.raw_url LIKE 'webinars/%' OR
           ur.raw_url LIKE 'nccn_pdfs/%' THEN
        supabase_storage_base || ur.raw_url
      WHEN ur.storage_path IS NOT NULL AND ur.storage_path != '' THEN
        supabase_storage_base || ur.storage_path
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
`;

  try {
    console.log('Applying migration via Supabase REST API...');

    // Execute SQL via the REST API using supabase-js internal endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql_query: sql }),
    });

    if (!response.ok) {
      // This endpoint might not exist, try another approach
      console.log('exec_sql not available, trying direct SQL approach...');

      // For now, let's just verify and provide manual instructions
      console.log('\n📋 Manual fix required:');
      console.log('1. Go to https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new');
      console.log('2. Paste the following SQL and run it:\n');
      console.log(sql);
      return;
    }

    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('API Error:', error);
    console.log('\n📋 Manual fix required:');
    console.log('1. Go to https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new');
    console.log('2. Run the migration file: supabase/migrations/20251201000004_fix_resource_urls_correct_project.sql');
  }
}

applyMigration();
