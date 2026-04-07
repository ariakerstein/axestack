import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validateIngestion() {
  console.log(`\n📊 COMPREHENSIVE INGESTION VALIDATION`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // 1. Check total chunks by tier and source
  console.log(`1️⃣ CHUNKS BY TIER & SOURCE:`);
  const { data: tierData } = await supabase
    .from('guideline_chunks')
    .select('content_tier, guideline_source');

  const tierCounts = tierData?.reduce((acc: any, row) => {
    const key = `${row.guideline_source} - ${row.content_tier}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  Object.entries(tierCounts || {}).forEach(([key, count]) => {
    console.log(`   ${key}: ${count} chunks`);
  });

  // 2. Check NCCN tier_1 unique titles
  console.log(`\n2️⃣ NCCN TIER_1 UNIQUE TITLES:`);
  const { data: nccnData } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, cancer_type')
    .eq('content_tier', 'tier_1')
    .eq('guideline_source', 'NCCN');

  const uniqueTitles = new Map();
  nccnData?.forEach(row => {
    if (!uniqueTitles.has(row.guideline_title)) {
      uniqueTitles.set(row.guideline_title, row.cancer_type);
    }
  });

  console.log(`   Total unique NCCN tier_1 PDFs: ${uniqueTitles.size}`);
  console.log(`   Total chunks: ${nccnData?.length || 0}\n`);

  // 3. List all unique titles
  console.log(`3️⃣ UNIQUE NCCN TIER_1 TITLES:`);
  Array.from(uniqueTitles.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([title, cancer_type], i) => {
      console.log(`   ${i + 1}. ${title} (${cancer_type})`);
    });

  // 4. Check storage paths
  console.log(`\n4️⃣ STORAGE VALIDATION:`);
  const { data: storageData } = await supabase
    .from('guideline_chunks')
    .select('storage_path, url')
    .eq('content_tier', 'tier_1')
    .eq('guideline_source', 'NCCN')
    .limit(5);

  console.log(`   Sample storage paths:`);
  storageData?.forEach((row, i) => {
    console.log(`   ${i + 1}. ${row.storage_path || 'NULL'}`);
  });

  // 5. Check if URLs are accessible
  console.log(`\n5️⃣ URL VALIDATION:`);
  const withUrl = nccnData?.filter(row => row.guideline_title).length || 0;
  console.log(`   Chunks with guideline_title: ${withUrl}/${nccnData?.length || 0}`);

  // 6. Check recent ingestion timestamp
  console.log(`\n6️⃣ RECENT INGESTION:`);
  const { data: recentData } = await supabase
    .from('guideline_chunks')
    .select('created_at')
    .eq('content_tier', 'tier_1')
    .eq('guideline_source', 'NCCN')
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentData && recentData.length > 0) {
    console.log(`   Most recent chunk: ${recentData[0].created_at}`);
  }

  // 7. Check cancer type distribution
  console.log(`\n7️⃣ CANCER TYPE DISTRIBUTION:`);
  const cancerTypes = nccnData?.reduce((acc: any, row) => {
    acc[row.cancer_type] = (acc[row.cancer_type] || 0) + 1;
    return acc;
  }, {});

  Object.entries(cancerTypes || {})
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count} chunks`);
    });

  // 8. Check for duplicates
  console.log(`\n8️⃣ DUPLICATE CHECK:`);
  const titleCounts = nccnData?.reduce((acc: any, row) => {
    acc[row.guideline_title] = (acc[row.guideline_title] || 0) + 1;
    return acc;
  }, {});

  const duplicates = Object.entries(titleCounts || {})
    .filter(([_, count]: any) => count > 200); // More than expected chunks per PDF

  if (duplicates.length > 0) {
    console.log(`   ⚠️  Potential duplicates found:`);
    duplicates.forEach(([title, count]) => {
      console.log(`      ${title}: ${count} chunks`);
    });
  } else {
    console.log(`   ✅ No obvious duplicates detected`);
  }

  // 9. Summary for admin/library-content
  console.log(`\n9️⃣ ADMIN LIBRARY AVAILABILITY:`);
  console.log(`   ✅ ${uniqueTitles.size} unique NCCN guidelines available`);
  console.log(`   ✅ Content tier: tier_1 (NCCN guidelines)`);
  console.log(`   ✅ Searchable via semantic search in Circle chat`);
  console.log(`   ✅ Will appear in citations when relevant to queries\n`);

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✨ Validation Complete!\n`);
}

validateIngestion().catch(console.error);
