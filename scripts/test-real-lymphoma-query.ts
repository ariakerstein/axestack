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

async function testRealQuery() {
  console.log(`\n🔍 TESTING REAL LYMPHOMA QUERY\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const query = "What are clinical trials for lymphoma?";
  console.log(`Query: "${query}"\n`);

  // Generate embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Test with different thresholds
  const thresholds = [0.40, 0.30, 0.25, 0.20, 0.15];

  for (const threshold of thresholds) {
    console.log(`\nThreshold ${threshold}:`);

    const { data: results, error } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: 20,
      cancer_type_filter: null  // NO cancer type filter
    });

    if (error) {
      console.error(`  ❌ Error:`, error.message);
    } else {
      console.log(`  ✅ ${results?.length || 0} chunks returned`);

      if (results && results.length > 0) {
        const uniqueTitles = new Set(results.map((r: any) => r.guideline_title));
        console.log(`  📚 Unique guidelines: ${uniqueTitles.size}`);

        const lymphomaResults = results.filter((r: any) =>
          r.guideline_title?.toLowerCase().includes('lymph')
        );
        console.log(`  🎯 Lymphoma-specific: ${lymphomaResults.length} chunks`);

        if (lymphomaResults.length > 0) {
          console.log(`  Top lymphoma results:`);
          const lymphomaTitles = new Set(lymphomaResults.map((r: any) => r.guideline_title));
          Array.from(lymphomaTitles).slice(0, 5).forEach((title, i) => {
            const chunks = lymphomaResults.filter((r: any) => r.guideline_title === title);
            const sample = chunks[0];
            console.log(`    ${i + 1}. ${title}`);
            console.log(`       Similarity: ${sample.similarity?.toFixed(4)}`);
            console.log(`       Version: ${sample.version_date || 'null'}`);
            console.log(`       URL: ${sample.url || 'null'}`);
          });
        }
      }
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

testRealQuery().catch(console.error);
