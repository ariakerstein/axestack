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

async function checkChunkContent() {
  console.log(`\n🔍 CHECKING CHUNK CONTENT QUALITY\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Get sample lymphoma chunks
  const { data: lymphomaChunks } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, chunk_text, chunk_embedding_vec, token_count')
    .eq('guideline_source', 'NCCN')
    .ilike('guideline_title', '%Marginal Zone Lymphomas%')
    .not('chunk_embedding_vec', 'is', null)
    .limit(5);

  if (!lymphomaChunks || lymphomaChunks.length === 0) {
    console.error('No lymphoma chunks found');
    return;
  }

  console.log(`Found ${lymphomaChunks.length} sample chunks\n`);

  for (let i = 0; i < lymphomaChunks.length; i++) {
    const chunk = lymphomaChunks[i];
    console.log(`\nChunk ${i + 1}:`);
    console.log(`  Title: ${chunk.guideline_title}`);
    console.log(`  Token count: ${chunk.token_count}`);
    console.log(`  Text length: ${chunk.chunk_text?.length || 0} chars`);
    console.log(`  Text preview: ${chunk.chunk_text?.substring(0, 200)}...`);
    console.log(`  Has embedding: ${chunk.chunk_embedding_vec ? 'YES' : 'NO'}`);

    // Test semantic similarity with a relevant query
    if (chunk.chunk_embedding_vec) {
      const queryEmbedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: "What are treatment options for marginal zone lymphoma?"
      });

      // Calculate cosine similarity manually
      const chunkEmb = chunk.chunk_embedding_vec as number[];
      const queryEmb = queryEmbedding.data[0].embedding;

      // Cosine similarity = dot product / (norm1 * norm2)
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let j = 0; j < chunkEmb.length; j++) {
        dotProduct += chunkEmb[j] * queryEmb[j];
        norm1 += chunkEmb[j] * chunkEmb[j];
        norm2 += queryEmb[j] * queryEmb[j];
      }

      const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
      console.log(`  Similarity to "treatment options for marginal zone lymphoma": ${similarity.toFixed(4)}`);
    }
  }

  // Now test if the query itself generates a good embedding
  console.log(`\n\nTesting query embedding:`);
  const testQueries = [
    "What are treatment options for lymphoma?",
    "lymphoma treatment guidelines",
    "marginal zone lymphoma clinical trials"
  ];

  for (const query of testQueries) {
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query
    });
    console.log(`\n  Query: "${query}"`);
    console.log(`  Embedding dimensions: ${embedding.data[0].embedding.length}`);
    console.log(`  First 10 values: ${embedding.data[0].embedding.slice(0, 10).map(v => v.toFixed(4)).join(', ')}`);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

checkChunkContent().catch(console.error);
