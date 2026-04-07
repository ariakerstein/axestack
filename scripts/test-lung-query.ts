// Test RAG query for lung cancer content
// Run with: npx tsx scripts/test-lung-query.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://felofmlhqwcdpiyjgstx.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDY3NDM4MCwiZXhwIjoyMDU2MjUwMzgwfQ.OC0ma2mN2Np_-AEL4siwLaUV0eGZ1tDXgbghMfB61pQ'
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function testQuery(query: string) {
  console.log(`\n🔍 Query: "${query}"\n`);
  console.log('Generating embedding...');

  const embedding = await generateEmbedding(query);

  console.log('Searching RAG database...\n');

  // Use the match_chunks function
  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: embedding,
    match_threshold: 0.3,
    match_count: 5,
  });

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ No results found.');
    return;
  }

  console.log(`✅ Found ${data.length} relevant chunks:\n`);
  console.log('='.repeat(80));

  data.forEach((chunk: any, i: number) => {
    console.log(`\n📄 Result ${i + 1} (similarity: ${(chunk.similarity * 100).toFixed(1)}%)`);
    console.log(`   Title: ${chunk.guideline_title}`);
    console.log(`   Source: ${chunk.guideline_source}`);
    console.log(`   Cancer: ${chunk.cancer_type || 'General'}`);
    console.log(`   Tier: ${chunk.content_tier}`);
    console.log(`   URL: ${chunk.url ? chunk.url.substring(0, 50) + '...' : 'N/A'}`);
    console.log(`\n   Content preview:`);
    console.log(`   ${chunk.chunk_text.substring(0, 300)}...`);
    console.log('-'.repeat(80));
  });
}

// Test queries
const queries = [
  'What are the treatment options for lung cancer?',
  'lung cancer symptoms and diagnosis',
];

async function main() {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set. Please set it in your environment.');
    process.exit(1);
  }

  for (const query of queries) {
    await testQuery(query);
  }
}

main();
