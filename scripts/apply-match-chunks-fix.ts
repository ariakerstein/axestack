import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMatchChunksFix() {
  console.log(`\n🔧 APPLYING MATCH_CHUNKS FIX TO DATABASE\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const sql = `
-- Drop ALL existing versions of match_chunks
DROP FUNCTION IF EXISTS match_chunks(vector, float, int, text) CASCADE;
DROP FUNCTION IF EXISTS match_chunks(vector(1536), float, int, text) CASCADE;
DROP FUNCTION IF EXISTS match_chunks CASCADE;

-- Create the CORRECT match_chunks function with version_date
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
  similarity float,
  url text,
  storage_path text,
  version_date text,
  publication_date text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gc.id,
    gc.guideline_title,
    gc.guideline_source,
    gc.cancer_type,
    gc.chunk_text,
    gc.chunk_index,
    1 - (gc.chunk_embedding_vec <=> query_embedding) AS similarity,
    gc.url,
    gc.storage_path,
    gc.version_date,
    gc.publication_date
  FROM
    guideline_chunks gc
  WHERE
    gc.guideline_title IS NOT NULL
    AND gc.guideline_source IS NOT NULL
    AND (gc.url IS NOT NULL OR gc.storage_path IS NOT NULL)
    AND (cancer_type_filter IS NULL OR gc.cancer_type ILIKE '%' || cancer_type_filter || '%')
    AND (1 - (gc.chunk_embedding_vec <=> query_embedding)) >= match_threshold
  ORDER BY
    gc.chunk_embedding_vec <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_chunks TO authenticated, anon, service_role;
`;

  console.log('Executing SQL to update match_chunks function...\n');

  // Split SQL into separate statements and execute each
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.length === 0) continue;

    console.log(`Executing: ${statement.substring(0, 60)}...`);

    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' }) as any;

    if (error) {
      console.error(`❌ Error executing statement:`, error);
      console.log('Trying alternative method via REST API...\n');

      // Alternative: Use the REST API endpoint directly
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
        },
        body: JSON.stringify({ sql: sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API Error:', errorText);
        console.log('\n⚠️  MANUAL ACTION REQUIRED:');
        console.log('Please run FIX_MATCH_CHUNKS_SOURCE_DIVERSITY.sql in Supabase Dashboard SQL Editor\n');
        return;
      }
    } else {
      console.log('✅ Statement executed successfully\n');
    }
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n✅ MATCH_CHUNKS FIX APPLIED\n`);
  console.log('Testing the updated function...\n');

  // Test the function
  const { data: testChunk } = await supabase
    .from('guideline_chunks')
    .select('chunk_embedding_vec')
    .limit(1)
    .single();

  if (testChunk) {
    const { data: testResults, error: testError } = await supabase.rpc('match_chunks', {
      query_embedding: testChunk.chunk_embedding_vec,
      match_threshold: 0.5,
      match_count: 5,
      cancer_type_filter: null
    });

    if (testError) {
      console.error('❌ Test failed:', testError);
    } else {
      console.log(`✅ Test successful! Returned ${testResults?.length || 0} chunks`);
      if (testResults && testResults.length > 0) {
        console.log('Sample result columns:', Object.keys(testResults[0]));
      }
    }
  }
}

applyMatchChunksFix().catch(console.error);
