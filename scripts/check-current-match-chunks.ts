import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkMatchChunksSchema() {
  console.log(`\n🔍 CHECKING MATCH_CHUNKS FUNCTION SCHEMA\n`);

  // Query pg_catalog to get the function definition
  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          proname AS function_name,
          pg_get_function_result(oid) AS return_type,
          pg_get_function_arguments(oid) AS arguments
        FROM pg_proc
        WHERE proname = 'match_chunks';
      `
    });

  if (error) {
    console.error('Error querying function schema:', error);
    console.log('\nTrying alternative method...\n');

    // Alternative: Try to call the function with dummy data and see what columns it returns
    const { data: testData, error: testError } = await supabase
      .from('guideline_chunks')
      .select('chunk_embedding_vec')
      .limit(1)
      .single();

    if (!testError && testData) {
      console.log('Got a sample embedding, testing match_chunks...');

      const { data: matchResult, error: matchError } = await supabase.rpc('match_chunks', {
        query_embedding: testData.chunk_embedding_vec,
        match_threshold: 0.9,
        match_count: 1,
        cancer_type_filter: null
      });

      if (matchError) {
        console.log('Error calling match_chunks:');
        console.log(JSON.stringify(matchError, null, 2));
      } else {
        console.log('match_chunks returned successfully:');
        console.log(`Result count: ${matchResult?.length || 0}`);
        if (matchResult && matchResult.length > 0) {
          console.log('Columns returned:');
          Object.keys(matchResult[0]).forEach(key => {
            console.log(`  - ${key}: ${typeof matchResult[0][key]}`);
          });
        }
      }
    }
  } else {
    console.log('Function schema:');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkMatchChunksSchema().catch(console.error);
