import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import OpenAI from 'openai';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY!
});

async function testMatchChunksDirectly() {
  console.log(`\n🔍 TESTING MATCH_CHUNKS FUNCTION DIRECTLY\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Test 1: Generate embedding for "lymphoma treatment"
  console.log(`Test 1: Lymphoma treatment query`);
  const query1 = "What are the treatment options for lymphoma?";
  const embedding1 = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query1
  });

  console.log(`Testing with threshold 0.40, count 50...`);
  const { data: results1, error: error1 } = await supabase.rpc('match_chunks', {
    query_embedding: embedding1.data[0].embedding,
    match_threshold: 0.40,
    match_count: 50,
    cancer_type_filter: null
  });

  if (error1) {
    console.error(`❌ Error:`, error1);
  } else {
    console.log(`✅ Returned ${results1?.length || 0} chunks`);
    if (results1 && results1.length > 0) {
      const uniqueTitles = new Set(results1.map((r: any) => r.guideline_title));
      console.log(`Unique titles: ${uniqueTitles.size}`);
      Array.from(uniqueTitles).slice(0, 10).forEach((title, i) => {
        const count = results1.filter((r: any) => r.guideline_title === title).length;
        const sample = results1.find((r: any) => r.guideline_title === title) as any;
        console.log(`  ${i + 1}. ${title} (${count} chunks)`);
        console.log(`      similarity: ${sample.similarity?.toFixed(4)}`);
        console.log(`      version_date: ${sample.version_date || 'null'}`);
        console.log(`      url: ${sample.url || 'null'}`);
      });
    }
  }

  // Test 2: Try with lower threshold
  console.log(`\nTest 2: Same query with threshold 0.30...`);
  const { data: results2, error: error2 } = await supabase.rpc('match_chunks', {
    query_embedding: embedding1.data[0].embedding,
    match_threshold: 0.30,
    match_count: 50,
    cancer_type_filter: null
  });

  if (error2) {
    console.error(`❌ Error:`, error2);
  } else {
    console.log(`✅ Returned ${results2?.length || 0} chunks`);
  }

  // Test 3: Check what similarity scores we actually have
  console.log(`\nTest 3: Checking actual similarity scores in database...`);
  const { data: sampleChunk } = await supabase
    .from('guideline_chunks')
    .select('chunk_embedding_vec, guideline_title, chunk_text')
    .eq('guideline_source', 'NCCN')
    .ilike('guideline_title', '%lymphoma%')
    .limit(1)
    .single();

  if (sampleChunk) {
    console.log(`Sample chunk from: ${sampleChunk.guideline_title}`);
    console.log(`Text: ${sampleChunk.chunk_text.substring(0, 100)}...`);

    // Calculate similarity between query and sample chunk
    const { data: simResults } = await supabase.rpc('match_chunks', {
      query_embedding: embedding1.data[0].embedding,
      match_threshold: 0.0, // No threshold
      match_count: 100,
      cancer_type_filter: null
    });

    if (simResults && simResults.length > 0) {
      const lymphomaSims = simResults
        .filter((r: any) => r.guideline_title?.toLowerCase().includes('lymph'))
        .slice(0, 10);

      console.log(`\nTop 10 lymphoma chunks by similarity:`);
      lymphomaSims.forEach((r: any, i: number) => {
        console.log(`  ${i + 1}. ${r.guideline_title}`);
        console.log(`     Similarity: ${r.similarity?.toFixed(4)}`);
        console.log(`     Text: ${r.chunk_text?.substring(0, 80)}...`);
      });

      const minSim = Math.min(...lymphomaSims.map((r: any) => r.similarity));
      const maxSim = Math.max(...lymphomaSims.map((r: any) => r.similarity));
      console.log(`\nSimilarity range for lymphoma chunks: ${minSim.toFixed(4)} - ${maxSim.toFixed(4)}`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

testMatchChunksDirectly().catch(console.error);
