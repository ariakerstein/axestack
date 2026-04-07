import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkIngestion() {
  const { data, error } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, guideline_source, content_tier')
    .eq('content_tier', 'tier_1')
    .eq('guideline_source', 'NCCN');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const uniqueTitles = new Set(data.map(d => d.guideline_title));

  console.log(`\n📊 BULK INGESTION RESULTS`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Total chunks: ${data.length}`);
  console.log(`✅ Unique NCCN PDFs: ${uniqueTitles.size}`);
  console.log(`\n📚 Ingested PDFs:`);
  Array.from(uniqueTitles).sort().forEach((title, i) => {
    console.log(`   ${i + 1}. ${title}`);
  });
}

checkIngestion();
