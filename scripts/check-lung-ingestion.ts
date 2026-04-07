// Check if lung cancer content from cancer.gov was ingested
// Run with: npx tsx scripts/check-lung-ingestion.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://felofmlhqwcdpiyjgstx.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDY3NDM4MCwiZXhwIjoyMDU2MjUwMzgwfQ.OC0ma2mN2Np_-AEL4siwLaUV0eGZ1tDXgbghMfB61pQ'
);

async function checkLungContent() {
  console.log('🔍 Searching for lung cancer content from cancer.gov...\n');

  // Search for recently ingested lung cancer content from cancer.gov
  const { data, error } = await supabase
    .from('guideline_chunks')
    .select('id, guideline_title, guideline_source, cancer_type, content_tier, content_type, url, updated_at, chunk_text')
    .or('url.ilike.%cancer.gov%lung%,guideline_title.ilike.%Lung%Patient%')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ No lung cancer content from cancer.gov found in database.\n');
    console.log('The URL was previewed but not yet ingested.');
    console.log('\nTo ingest:');
    console.log('1. Go to /admin/content-upload');
    console.log('2. Paste: https://www.cancer.gov/types/lung');
    console.log('3. Click "Fetch & Preview"');
    console.log('4. Review the metadata');
    console.log('5. Click "Confirm & Ingest to RAG"');
    return;
  }

  console.log('✅ Found', data.length, 'chunks related to lung cancer:\n');

  // Group by title
  const byTitle: Record<string, { count: number; sample: any }> = {};
  data.forEach(d => {
    const title = d.guideline_title || 'Unknown';
    if (!byTitle[title]) {
      byTitle[title] = { count: 0, sample: d };
    }
    byTitle[title].count++;
  });

  Object.entries(byTitle).forEach(([title, info]) => {
    const d = info.sample;
    console.log('📄 Title:', title);
    console.log('   Source:', d.guideline_source);
    console.log('   Cancer Type:', d.cancer_type);
    console.log('   Tier:', d.content_tier, '| Type:', d.content_type);
    console.log('   URL:', d.url ? d.url.substring(0, 60) + '...' : 'N/A');
    console.log('   Chunks:', info.count);
    console.log('   Updated:', d.updated_at);
    console.log('   Preview:', d.chunk_text ? d.chunk_text.substring(0, 150) + '...' : 'N/A');
    console.log();
  });
}

checkLungContent();
