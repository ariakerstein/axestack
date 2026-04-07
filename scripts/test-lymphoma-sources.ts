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

async function testLymphomaSourceDiversity() {
  console.log(`\n🔍 TESTING LYMPHOMA QUERY SOURCE DIVERSITY\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const testQuery = "What are the treatment options for lymphoma?";
  console.log(`Test Query: "${testQuery}"\n`);

  // Step 1: Generate embedding
  console.log(`📊 Step 1: Generating query embedding...`);
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: testQuery
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;
  console.log(`  ✅ Embedding generated (${queryEmbedding.length} dimensions)\n`);

  // Step 2: Test match_chunks RPC directly
  console.log(`📊 Step 2: Testing match_chunks RPC function...`);
  const { data: matchResults, error: matchError } = await supabase.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.40,
    match_count: 50,
    cancer_type_filter: null
  }) as { data: any[] | null, error: any };

  if (matchError) {
    console.error(`  ❌ RPC Error:`, matchError);
  } else {
    console.log(`  ✅ RPC returned ${matchResults?.length || 0} chunks`);

    if (matchResults && matchResults.length > 0) {
      // Analyze source diversity
      const uniqueSources = new Set(matchResults.map((r: any) => r.guideline_title));
      console.log(`  📚 Unique sources: ${uniqueSources.size}`);
      console.log(`  Sources:`);
      uniqueSources.forEach((source: string) => {
        const count = matchResults.filter((r: any) => r.guideline_title === source).length;
        console.log(`    - ${source} (${count} chunks)`);
      });

      console.log(`\n  📋 Sample chunks (first 5):`);
      matchResults.slice(0, 5).forEach((chunk: any, idx: number) => {
        console.log(`    ${idx + 1}. ${chunk.guideline_title}`);
        console.log(`       Similarity: ${chunk.similarity?.toFixed(4)}`);
        console.log(`       Text preview: ${chunk.chunk_text?.substring(0, 80)}...`);
      });
    }
  }

  // Step 3: Check database for lymphoma-related content
  console.log(`\n📊 Step 3: Checking database for lymphoma-related guidelines...`);
  const { data: lymphomaChunks, error: dbError } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, guideline_source, content_tier, version_date')
    .eq('guideline_source', 'NCCN')
    .eq('content_tier', 'tier_1')
    .ilike('guideline_title', '%lymph%');

  if (dbError) {
    console.error(`  ❌ Database Error:`, dbError);
  } else {
    const uniqueLymphomaTitles = new Set(lymphomaChunks?.map(c => c.guideline_title) || []);
    console.log(`  ✅ Found ${lymphomaChunks?.length || 0} chunks from ${uniqueLymphomaTitles.size} guidelines`);
    console.log(`  Guidelines:`);
    uniqueLymphomaTitles.forEach((title: string) => {
      const count = lymphomaChunks?.filter(c => c.guideline_title === title).length || 0;
      const sample = lymphomaChunks?.find(c => c.guideline_title === title);
      console.log(`    - ${title} (${count} chunks)`);
      if (sample?.version_date) {
        console.log(`      Version: ${sample.version_date}`);
      }
    });
  }

  // Step 4: Test Edge Function directly
  console.log(`\n📊 Step 4: Testing Edge Function (direct-navis)...`);
  try {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/direct-navis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        question: testQuery,
        cancerType: null,
        model: 'claude-3-haiku'
      })
    });

    if (!response.ok) {
      console.error(`  ❌ Edge Function Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`  Error details:`, errorText);
    } else {
      const result = await response.json();
      console.log(`  ✅ Edge Function returned successfully`);
      console.log(`  Response preview:`, result.response?.substring(0, 200) + '...');

      if (result.citationUrls) {
        console.log(`\n  📚 Citation URLs returned: ${result.citationUrls.length}`);
        result.citationUrls.forEach((citation: any, idx: number) => {
          console.log(`    ${idx + 1}. ${citation.title}`);
          console.log(`       URL: ${citation.url}`);
        });
      }

      if (result.citations) {
        console.log(`\n  📝 Text citations returned: ${result.citations.length}`);
        result.citations.forEach((citation: string, idx: number) => {
          console.log(`    ${idx + 1}. ${citation}`);
        });
      }
    }
  } catch (error: any) {
    console.error(`  ❌ Fetch Error:`, error.message);
  }

  // Step 5: Check for deduplication logic issues
  console.log(`\n📊 Step 5: Analyzing potential deduplication issues...`);
  if (matchResults && matchResults.length > 0) {
    // Simulate the extractCitationUrlsFromChunks logic
    const urlMap = new Map<string, any>();

    for (const chunk of matchResults) {
      const source = chunk.guideline_source || '';
      let title = chunk.guideline_title || source || 'Medical Guideline';

      if (source === 'NCCN' && chunk.version_date) {
        title += ` (${chunk.version_date})`;
      }

      const url = chunk.url || chunk.storage_path || null;

      if (url && !urlMap.has(url)) {
        urlMap.set(url, { title, url, source });
      }
    }

    console.log(`  After URL deduplication: ${urlMap.size} unique citations`);
    console.log(`  Unique citations:`);
    Array.from(urlMap.values()).forEach((citation, idx) => {
      console.log(`    ${idx + 1}. ${citation.title}`);
    });

    // Check if multiple guidelines share the same URL
    const titleToUrlCount = new Map<string, Set<string>>();
    matchResults.forEach((chunk: any) => {
      const title = chunk.guideline_title;
      const url = chunk.url || chunk.storage_path;
      if (!titleToUrlCount.has(title)) {
        titleToUrlCount.set(title, new Set());
      }
      if (url) {
        titleToUrlCount.get(title)!.add(url);
      }
    });

    console.log(`\n  URL distribution per guideline:`);
    titleToUrlCount.forEach((urls, title) => {
      console.log(`    ${title}: ${urls.size} unique URL(s)`);
    });
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n✅ DIAGNOSIS COMPLETE\n`);
}

testLymphomaSourceDiversity().catch(console.error);
