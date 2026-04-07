import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validateAdminView() {
  console.log(`\n🔍 ADMIN CONTENT LIBRARY VIEW VALIDATION`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Query exactly as admin page does
  const { data: chunks, error } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, guideline_source, cancer_type, content_tier, storage_path, url, updated_at, status');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  // Group by guideline_title (as admin page does)
  const grouped = chunks?.reduce((acc: any, chunk) => {
    const title = chunk.guideline_title || 'Untitled';
    if (!acc[title]) {
      acc[title] = {
        title,
        source: chunk.guideline_source,
        cancer_type: chunk.cancer_type,
        content_tier: chunk.content_tier,
        storage_path: chunk.storage_path,
        url: chunk.url,
        updated_at: chunk.updated_at,
        status: chunk.status,
        chunk_count: 0
      };
    }
    acc[title].chunk_count++;
    return acc;
  }, {});

  const items = Object.values(grouped || {});

  console.log(`📚 TOTAL ITEMS IN ADMIN LIBRARY: ${items.length}\n`);

  // Filter by NCCN tier_1
  const nccnItems = items.filter((item: any) =>
    item.source === 'NCCN' && item.content_tier === 'tier_1'
  );

  console.log(`✅ NCCN TIER_1 ITEMS: ${nccnItems.length}\n`);

  console.log(`📋 ITEMS THAT WILL APPEAR IN ADMIN/CONTENT-LIBRARY:\n`);

  nccnItems
    .sort((a: any, b: any) => a.title.localeCompare(b.title))
    .forEach((item: any, i) => {
      console.log(`${i + 1}. ${item.title}`);
      console.log(`   Source: ${item.source}`);
      console.log(`   Tier: ${item.content_tier}`);
      console.log(`   Cancer Type: ${item.cancer_type || 'general'}`);
      console.log(`   Chunks: ${item.chunk_count}`);
      console.log(`   Storage: ${item.storage_path ? '✅' : '❌'}`);
      console.log(`   Status: ${item.status || 'active'}\n`);
    });

  // Summary stats
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 SUMMARY:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const totalChunks = nccnItems.reduce((sum: number, item: any) => sum + item.chunk_count, 0);
  console.log(`   Total NCCN PDFs: ${nccnItems.length}`);
  console.log(`   Total Chunks: ${totalChunks}`);
  console.log(`   Avg Chunks per PDF: ${Math.round(totalChunks / nccnItems.length)}`);

  const withStorage = nccnItems.filter((item: any) => item.storage_path).length;
  console.log(`   PDFs with Storage: ${withStorage}/${nccnItems.length}`);

  console.log(`\n✨ These items are now available in /admin/content-library!\n`);
}

validateAdminView().catch(console.error);
