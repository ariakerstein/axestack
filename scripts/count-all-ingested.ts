import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function countAllIngested() {
  console.log(`\n🔢 COMPLETE INGESTION COUNT (NO LIMITS)\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Get ALL chunks without limit
  let allChunks: any[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('guideline_chunks')
      .select('guideline_title, cancer_type, storage_path')
      .eq('content_tier', 'tier_1')
      .eq('guideline_source', 'NCCN')
      .range(from, from + batchSize - 1);

    if (error) {
      console.error('Error:', error);
      break;
    }

    if (data && data.length > 0) {
      allChunks = allChunks.concat(data);
      from += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  const uniqueTitles = new Set(allChunks.map(c => c.guideline_title));
  const withStorage = allChunks.filter(c => c.storage_path).length;

  console.log(`✅ Total NCCN Chunks: ${allChunks.length}`);
  console.log(`✅ Unique NCCN PDFs: ${uniqueTitles.size}`);
  console.log(`✅ Chunks with Storage: ${withStorage}\n`);

  // Group by title and count
  const grouped = allChunks.reduce((acc: any, chunk) => {
    const title = chunk.guideline_title;
    if (!acc[title]) {
      acc[title] = {
        title,
        cancer_type: chunk.cancer_type,
        count: 0,
        has_storage: !!chunk.storage_path
      };
    }
    acc[title].count++;
    return acc;
  }, {});

  const items = Object.values(grouped).sort((a: any, b: any) => a.title.localeCompare(b.title));

  console.log(`📚 ALL ${items.length} NCCN PDFs:\n`);
  items.forEach((item: any, i) => {
    const storage = item.has_storage ? '✅' : '❌';
    console.log(`${String(i + 1).padStart(2, ' ')}. ${item.title} (${item.count} chunks) ${storage}`);
  });

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 FINAL SUMMARY:`);
  console.log(`   Started with: 68 PDFs`);
  console.log(`   Successfully ingested: ${items.length} unique PDFs`);
  console.log(`   Total chunks created: ${allChunks.length}`);
  console.log(`   Avg chunks per PDF: ${Math.round(allChunks.length / items.length)}`);
  console.log(`\n✨ All ${items.length} PDFs are visible in /admin/content-library\n`);
}

countAllIngested().catch(console.error);
