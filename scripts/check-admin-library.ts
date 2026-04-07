import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAdminLibrary() {
  console.log(`\n📚 ADMIN CONTENT LIBRARY VALIDATION`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // 1. Count unique NCCN PDFs
  const { data: allChunks } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, cancer_type, storage_path, url, updated_at')
    .eq('content_tier', 'tier_1')
    .eq('guideline_source', 'NCCN');

  const uniqueTitles = new Set(allChunks?.map(c => c.guideline_title) || []);

  console.log(`1️⃣  TOTAL NCCN PDFs IN ADMIN LIBRARY: ${uniqueTitles.size}\n`);

  // 2. Group by title (exactly as admin UI does)
  const grouped = allChunks?.reduce((acc: any, chunk) => {
    const title = chunk.guideline_title;
    if (!acc[title]) {
      acc[title] = {
        title,
        cancer_type: chunk.cancer_type,
        chunk_count: 0,
        storage_path: chunk.storage_path,
        url: chunk.url,
        updated_at: chunk.updated_at
      };
    }
    acc[title].chunk_count++;
    return acc;
  }, {});

  const items = Object.values(grouped || {});

  console.log(`2️⃣  COMPLETE LIST (as shown in /admin/content-library):\n`);
  items
    .sort((a: any, b: any) => a.title.localeCompare(b.title))
    .forEach((item: any, i) => {
      const storage = item.storage_path ? '✅' : '❌';
      console.log(`${String(i + 1).padStart(2, ' ')}. ${item.title}`);
      console.log(`    Cancer Type: ${item.cancer_type || 'general'}`);
      console.log(`    Chunks: ${item.chunk_count}`);
      console.log(`    Storage: ${storage}\n`);
    });

  // 3. Summary stats
  const totalChunks = items.reduce((sum: number, item: any) => sum + item.chunk_count, 0);
  const avgChunks = Math.round(totalChunks / items.length);
  const withStorage = items.filter((item: any) => item.storage_path).length;
  const storagePercent = Math.round((withStorage / items.length) * 100);

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`3️⃣  SUMMARY STATISTICS:\n`);
  console.log(`   Unique NCCN PDFs: ${items.length}`);
  console.log(`   Total Chunks: ${totalChunks}`);
  console.log(`   Avg Chunks/PDF: ${avgChunks}`);
  console.log(`   PDFs with Storage: ${withStorage}/${items.length} (${storagePercent}%)`);

  // 4. Recent ingestion check
  const recentChunks = allChunks?.filter(c => {
    const chunkDate = new Date(c.updated_at || 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return chunkDate >= today;
  }).length || 0;

  console.log(`   Chunks ingested today: ${recentChunks}\n`);

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ These ${items.length} PDFs are now visible in /admin/content-library\n`);
}

checkAdminLibrary().catch(console.error);
