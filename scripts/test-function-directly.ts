import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testFunction() {
  console.log(`\n🔍 TESTING MATCH_CHUNKS FUNCTION\n`);

  // Get a real embedding from the database
  const { data: sampleChunk, error: sampleError } = await supabase
    .from('guideline_chunks')
    .select('chunk_embedding_vec')
    .eq('guideline_source', 'NCCN')
    .not('chunk_embedding_vec', 'is', null)
    .limit(1)
    .single();

  if (sampleError || !sampleChunk) {
    console.error('Error getting sample:', sampleError);
    return;
  }

  console.log('Got sample embedding, testing match_chunks...\n');

  // Test with threshold 0.0 to get ANY results
  console.log('Test 1: Threshold 0.0 (should return something)...');
  const { data: test1, error: error1 } = await supabase.rpc('match_chunks', {
    query_embedding: sampleChunk.chunk_embedding_vec,
    match_threshold: 0.0,
    match_count: 10,
    cancer_type_filter: null
  }) as { data: any[] | null, error: any };

  if (error1) {
    console.error('❌ Error:', JSON.stringify(error1, null, 2));
    console.log('\n⚠️  The function still has the wrong schema!');
    console.log('Please run FIX_MATCH_CHUNKS_FINAL.sql in Supabase Dashboard\n');
    return;
  }

  console.log(`✅ Success! Returned ${test1?.length || 0} chunks`);

  if (test1 && test1.length > 0) {
    console.log('\nColumns returned:');
    Object.keys(test1[0]).forEach(key => {
      console.log(`  - ${key}`);
    });

    console.log('\nSample result:');
    const sample = test1[0];
    console.log(`  Title: ${sample.guideline_title}`);
    console.log(`  Source: ${sample.guideline_source}`);
    console.log(`  Version: ${sample.version_date || 'null'}`);
    console.log(`  URL: ${sample.url || 'null'}`);
    console.log(`  Similarity: ${sample.similarity?.toFixed(4)}`);
  } else {
    console.log('\n⚠️  No results returned even with threshold 0.0');
    console.log('This suggests the WHERE filters are excluding everything');
  }
}

testFunction().catch(console.error);
