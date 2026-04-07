import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testWithLymphomaEmbedding() {
  console.log(`\n🔍 TESTING WITH ACTUAL LYMPHOMA CHUNK EMBEDDING\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Get a real lymphoma chunk about treatment
  const { data: lymphomaChunk, error } = await supabase
    .from('guideline_chunks')
    .select('id, guideline_title, chunk_text, chunk_embedding_vec')
    .eq('guideline_source', 'NCCN')
    .ilike('guideline_title', '%lymphoma%')
    .ilike('chunk_text', '%treatment%')
    .not('chunk_embedding_vec', 'is', null)
    .limit(1)
    .single();

  if (error || !lymphomaChunk) {
    console.error('Error finding lymphoma chunk:', error);
    return;
  }

  console.log(`Found lymphoma chunk:`);
  console.log(`  ID: ${lymphomaChunk.id}`);
  console.log(`  Title: ${lymphomaChunk.guideline_title}`);
  console.log(`  Text: ${lymphomaChunk.chunk_text.substring(0, 200)}...\n`);

  // Use this chunk's embedding as a query
  console.log(`Using this chunk's embedding to search for similar chunks...`);

  const { data: results, error: searchError } = await supabase.rpc('match_chunks', {
    query_embedding: lymphomaChunk.chunk_embedding_vec,
    match_threshold: 0.5,  // 50% similarity
    match_count: 20,
    cancer_type_filter: null
  });

  if (searchError) {
    console.error(`❌ Search error:`, searchError);
  } else {
    console.log(`✅ Found ${results?.length || 0} similar chunks\n`);

    if (results && results.length > 0) {
      const uniqueTitles = new Set(results.map((r: any) => r.guideline_title));
      console.log(`Unique guidelines represented: ${uniqueTitles.size}`);

      console.log(`\nTop 10 results:`);
      results.slice(0, 10).forEach((r: any, i: number) => {
        console.log(`  ${i + 1}. ${r.guideline_title}`);
        console.log(`     Similarity: ${r.similarity?.toFixed(4)}`);
        console.log(`     Version: ${r.version_date || 'null'}`);
        console.log(`     Text: ${r.chunk_text?.substring(0, 80)}...`);
      });

      // Count lymphoma-related results
      const lymphomaResults = results.filter((r: any) =>
        r.guideline_title?.toLowerCase().includes('lymph')
      );
      console.log(`\nLymphoma-specific results: ${lymphomaResults.length}/${results.length}`);

      const lymphomaTitles = new Set(lymphomaResults.map((r: any) => r.guideline_title));
      console.log(`Unique lymphoma guidelines: ${lymphomaTitles.size}`);
      Array.from(lymphomaTitles).forEach(title => {
        console.log(`  - ${title}`);
      });
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

testWithLymphomaEmbedding().catch(console.error);
