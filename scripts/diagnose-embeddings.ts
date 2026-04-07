import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnoseEmbeddings() {
  console.log(`\n🔍 DIAGNOSING EMBEDDING STORAGE\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Get a sample chunk
  const { data: sample, error } = await supabase
    .from('guideline_chunks')
    .select('id, guideline_title, chunk_embedding_vec')
    .eq('guideline_source', 'NCCN')
    .not('chunk_embedding_vec', 'is', null)
    .limit(1)
    .single();

  if (error || !sample) {
    console.error('Error:', error);
    return;
  }

  console.log(`Sample chunk ID: ${sample.id}`);
  console.log(`Title: ${sample.guideline_title}\n`);

  const embedding = sample.chunk_embedding_vec;
  console.log(`Embedding type: ${typeof embedding}`);
  console.log(`Is array: ${Array.isArray(embedding)}`);
  console.log(`Is string: ${typeof embedding === 'string'}`);

  if (Array.isArray(embedding)) {
    console.log(`Array length: ${embedding.length}`);
    console.log(`First 10 values: ${embedding.slice(0, 10).join(', ')}`);
    console.log(`All values are numbers: ${embedding.every(v => typeof v === 'number')}`);
    console.log(`Any NaN values: ${embedding.some(v => isNaN(v))}`);
    console.log(`Any null values: ${embedding.some(v => v === null)}`);
  } else if (typeof embedding === 'string') {
    console.log(`String length: ${embedding.length}`);
    console.log(`First 100 chars: ${embedding.substring(0, 100)}`);
  } else {
    console.log(`Embedding value:`, embedding);
  }

  // Try to use it in a query
  console.log(`\n\nTesting if database can compute similarity...`);
  const { data: testResult, error: testError } = await supabase.rpc('match_chunks', {
    query_embedding: embedding,
    match_threshold: 0.9,  // Very high threshold - should match itself
    match_count: 1,
    cancer_type_filter: null
  });

  if (testError) {
    console.error(`❌ Error using embedding in query:`, testError);
  } else {
    console.log(`✅ Query succeeded, returned ${testResult?.length || 0} chunks`);
    if (testResult && testResult.length > 0) {
      console.log(`Top result similarity: ${testResult[0].similarity?.toFixed(4)}`);
      console.log(`Top result is same chunk: ${testResult[0].id === sample.id}`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

diagnoseEmbeddings().catch(console.error);
