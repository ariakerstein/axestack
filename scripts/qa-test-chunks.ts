import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import OpenAI from 'openai';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function qaTestChunks() {
  console.log(`\n🧪 COMPREHENSIVE QA TESTS FOR CHUNKS\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Test 1: Check total chunk count
  console.log(`TEST 1: Total Chunk Count`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  let allChunks: any[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: chunks, error } = await supabase
      .from('guideline_chunks')
      .select('id, guideline_title, guideline_source, content_tier')
      .range(from, from + batchSize - 1);

    if (error) {
      console.error('❌ Error fetching chunks:', error);
      return;
    }

    if (chunks && chunks.length > 0) {
      allChunks = allChunks.concat(chunks);
      from += batchSize;
      hasMore = chunks.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Total chunks: ${allChunks.length}`);
  console.log(`   (Embedding check skipped for performance)`);
  console.log();

  // Test 2: Source Diversity
  console.log(`TEST 2: Source Diversity for NCCN tier_1`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const nccnChunks = allChunks.filter(c =>
    c.guideline_source === 'NCCN' && c.content_tier === 'tier_1'
  );

  const uniqueTitles = new Set(nccnChunks.map(c => c.guideline_title));
  console.log(`✅ NCCN tier_1 chunks: ${nccnChunks.length}`);
  console.log(`✅ Unique NCCN tier_1 sources: ${uniqueTitles.size}`);

  // Show sample sources
  console.log(`\n📚 Sample sources (first 10):`);
  Array.from(uniqueTitles).slice(0, 10).forEach((title, i) => {
    const count = nccnChunks.filter(c => c.guideline_title === title).length;
    console.log(`   ${i + 1}. ${title} (${count} chunks)`);
  });
  console.log();

  // Test 3: Edge Function Test (Pancreatic Cancer)
  const testQuery = "What are the treatment options for pancreatic cancer?";
  console.log(`TEST 3: Edge Function Integration - Pancreatic Cancer`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`Query: "${testQuery}"\n`);

  try {
    const { data: functionResult, error: functionError } = await supabase.functions.invoke('direct-navis', {
      body: {
        query: testQuery,
        content_tier: 'tier_1'
      }
    });

    if (functionError) {
      console.error('❌ Edge Function error:', functionError);
    } else {
      console.log(`✅ Edge Function responded successfully`);

      if (functionResult?.sources) {
        console.log(`✅ Sources returned: ${functionResult.sources.length}`);
        const edgeSources = new Set(functionResult.sources.map((s: any) => s.title));
        console.log(`✅ Unique sources: ${edgeSources.size}`);

        if (edgeSources.size === 1) {
          console.log(`⚠️  WARNING: Edge function returning only 1 source!`);
        } else {
          console.log(`✅ Good source diversity from Edge Function!`);
        }

        console.log(`\n📚 Sources returned by Edge Function:\n`);
        functionResult.sources.forEach((source: any, i: number) => {
          console.log(`   ${i + 1}. ${source.title}`);
          console.log(`      Type: ${source.type}`);
          console.log(`      Relevance: ${source.relevance_score?.toFixed(3) || 'N/A'}`);
        });
      }

      if (functionResult?.answer) {
        console.log(`\n💬 Answer preview: ${functionResult.answer.substring(0, 200)}...`);
      }
    }
  } catch (err) {
    console.error('❌ Edge Function test failed:', err);
  }
  console.log();

  // Test 4: Recently Ingested Check
  console.log(`TEST 4: Recently Ingested PDFs`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const { data: recentChunks } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, created_at, guideline_source, content_tier')
    .order('created_at', { ascending: false })
    .limit(100);

  if (recentChunks) {
    const recentTitles = new Set(recentChunks.map(c => c.guideline_title));
    console.log(`✅ Found ${recentTitles.size} unique documents in latest 100 chunks`);

    console.log(`\n📅 Most recently ingested (last 10):\n`);
    Array.from(recentTitles).slice(0, 10).forEach((title, i) => {
      const chunk = recentChunks.find(c => c.guideline_title === title);
      console.log(`   ${i + 1}. ${title}`);
      console.log(`      Ingested: ${new Date(chunk!.created_at).toLocaleString()}`);
    });
  }
  console.log();

  // Summary
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ QA TESTS COMPLETE\n`);
  console.log(`Summary:`);
  console.log(`  - Total chunks: ${allChunks.length}`);
  console.log(`  - NCCN tier_1 sources: ${uniqueTitles.size}`);
  console.log(`  - Edge Function test completed (check output above for source diversity)`);
  console.log();
}

qaTestChunks().catch(console.error);
