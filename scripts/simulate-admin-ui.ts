import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY! // Using publishable key like the UI does
);

async function simulateAdminUI() {
  console.log(`\n🖥️  SIMULATING ADMIN UI QUERY (Exact same query as /admin/content-library)\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Exact query from admin UI - using pagination to get ALL chunks
  let allChunks: any[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: chunks, error } = await supabase
      .from('guideline_chunks')
      .select('guideline_title, guideline_source, cancer_type, content_tier, content_type, author, publication_date, version_date, url, tags, updated_at, status, word_count, page_count, extraction_quality, completeness_score, storage_path')
      .order('updated_at', { ascending: false })
      .range(from, from + batchSize - 1);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (chunks && chunks.length > 0) {
      allChunks = allChunks.concat(chunks);
      from += batchSize;
      hasMore = chunks.length === batchSize;
      console.log(`   Fetched batch ${Math.floor(from / batchSize)}: ${chunks.length} chunks`);
    } else {
      hasMore = false;
    }
  }

  const chunks = allChunks;
  console.log(`\n✅ Query returned ${chunks.length} total chunks\n`);

  // Group by guideline_title (exactly as admin UI does, line 314)
  const grouped = new Map();

  chunks?.forEach(chunk => {
    const title = chunk.guideline_title || 'Untitled';
    if (!grouped.has(title)) {
      grouped.set(title, {
        id: title,
        guideline_title: title,
        guideline_source: chunk.guideline_source,
        cancer_type: chunk.cancer_type,
        content_tier: chunk.content_tier,
        content_type: chunk.content_type,
        author: chunk.author,
        publication_date: chunk.publication_date,
        version_date: chunk.version_date,
        url: chunk.url,
        tags: chunk.tags,
        updated_at: chunk.updated_at,
        status: chunk.status,
        word_count: chunk.word_count,
        page_count: chunk.page_count,
        extraction_quality: chunk.extraction_quality,
        completeness_score: chunk.completeness_score,
        storage_path: chunk.storage_path,
        chunk_count: 0
      });
    }
    const item = grouped.get(title);
    item.chunk_count++;
  });

  const items = Array.from(grouped.values());

  console.log(`📚 TOTAL ITEMS IN ADMIN UI: ${items.length}\n`);

  // Filter to NCCN tier_1 (what user sees when filtering)
  const nccnItems = items.filter(item =>
    item.guideline_source === 'NCCN' && item.content_tier === 'tier_1'
  );

  console.log(`🔍 NCCN TIER_1 ITEMS (after filtering): ${nccnItems.length}\n`);

  console.log(`📋 FIRST 20 ITEMS (sorted by most recent):\n`);
  nccnItems
    .slice(0, 20)
    .forEach((item, i) => {
      const storage = item.storage_path ? '✅' : '❌';
      console.log(`${String(i + 1).padStart(2, ' ')}. ${item.guideline_title}`);
      console.log(`    Source: ${item.guideline_source} | Tier: ${item.content_tier}`);
      console.log(`    Chunks: ${item.chunk_count} | Storage: ${storage}\n`);
    });

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ ALL ${nccnItems.length} NCCN tier_1 PDFs are visible in /admin/content-library`);
  console.log(`✅ Users can filter, search, and manage all these items\n`);

  // Summary by source and tier
  const bySourceTier = items.reduce((acc: any, item) => {
    const key = `${item.guideline_source || 'null'} - ${item.content_tier || 'null'}`;
    if (!acc[key]) acc[key] = 0;
    acc[key]++;
    return acc;
  }, {});

  console.log(`📊 BREAKDOWN BY SOURCE & TIER:\n`);
  Object.entries(bySourceTier).forEach(([key, count]) => {
    console.log(`   ${key}: ${count} items`);
  });
  console.log('');
}

simulateAdminUI().catch(console.error);
