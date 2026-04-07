import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAllContent() {
  console.log(`\n📊 COMPLETE CONTENT LIBRARY INVENTORY\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Get ALL chunks without limit
  let allChunks: any[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  console.log('⏳ Fetching all chunks from database...\n');

  while (hasMore) {
    const { data, error } = await supabase
      .from('guideline_chunks')
      .select('guideline_title, guideline_source, content_tier, storage_path')
      .range(from, from + batchSize - 1);

    if (error) {
      console.error('Error:', error);
      break;
    }

    if (data && data.length > 0) {
      allChunks = allChunks.concat(data);
      from += batchSize;
      hasMore = data.length === batchSize;
      console.log(`   Fetched ${allChunks.length} chunks so far...`);
    } else {
      hasMore = false;
    }
  }

  console.log(`\n✅ Total chunks in database: ${allChunks.length}\n`);

  // Group by unique titles
  const uniqueTitles = new Set(allChunks.map(c => c.guideline_title));
  console.log(`✅ Unique documents (guideline_title): ${uniqueTitles.size}\n`);

  // Breakdown by source and tier
  const bySourceTier = allChunks.reduce((acc: any, chunk) => {
    const key = `${chunk.guideline_source || 'null'} - ${chunk.content_tier || 'null'}`;
    if (!acc[key]) acc[key] = { chunks: 0, titles: new Set() };
    acc[key].chunks++;
    acc[key].titles.add(chunk.guideline_title);
    return acc;
  }, {});

  console.log(`📚 BREAKDOWN BY SOURCE & TIER:\n`);
  Object.entries(bySourceTier)
    .sort((a: any, b: any) => b[1].chunks - a[1].chunks)
    .forEach(([key, value]: any) => {
      console.log(`   ${key}:`);
      console.log(`      Documents: ${value.titles.size}`);
      console.log(`      Chunks: ${value.chunks}\n`);
    });

  // NCCN breakdown
  const nccnChunks = allChunks.filter(c => c.guideline_source === 'NCCN');
  const nccnTitles = new Set(nccnChunks.map(c => c.guideline_title));

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🏥 NCCN CONTENT:`);
  console.log(`   Documents: ${nccnTitles.size}`);
  console.log(`   Total Chunks: ${nccnChunks.length}`);

  const nccnByTier = nccnChunks.reduce((acc: any, chunk) => {
    const tier = chunk.content_tier || 'null';
    if (!acc[tier]) acc[tier] = { chunks: 0, titles: new Set() };
    acc[tier].chunks++;
    acc[tier].titles.add(chunk.guideline_title);
    return acc;
  }, {});

  console.log(`   By Tier:`);
  Object.entries(nccnByTier).forEach(([tier, value]: any) => {
    console.log(`      ${tier}: ${value.titles.size} docs, ${value.chunks} chunks`);
  });

  // Webinar breakdown
  const webinarChunks = allChunks.filter(c => c.guideline_source === 'CancerPatientLab Webinars');
  const webinarTitles = new Set(webinarChunks.map(c => c.guideline_title));

  console.log(`\n🎥 WEBINAR CONTENT:`);
  console.log(`   Documents: ${webinarTitles.size}`);
  console.log(`   Total Chunks: ${webinarChunks.length}\n`);

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n✨ SUMMARY FOR ADMIN UI:`);
  console.log(`   Total Documents: ${uniqueTitles.size}`);
  console.log(`   Total Chunks: ${allChunks.length}`);
  console.log(`\n   This is what should show in /admin/content-library!\n`);
}

checkAllContent().catch(console.error);
