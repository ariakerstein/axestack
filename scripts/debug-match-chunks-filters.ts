import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugFilters() {
  console.log(`\n🔍 DEBUGGING MATCH_CHUNKS FILTERS\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Check each filter condition
  console.log(`Filter 1: guideline_title IS NOT NULL`);
  const { data: f1, count: c1 } = await supabase
    .from('guideline_chunks')
    .select('id', { count: 'exact', head: false })
    .eq('guideline_source', 'NCCN')
    .not('guideline_title', 'is', null);
  console.log(`  ✅ ${c1} chunks pass this filter\n`);

  console.log(`Filter 2: guideline_source IS NOT NULL`);
  const { data: f2, count: c2 } = await supabase
    .from('guideline_chunks')
    .select('id', { count: 'exact', head: false })
    .eq('guideline_source', 'NCCN')
    .not('guideline_source', 'is', null);
  console.log(`  ✅ ${c2} chunks pass this filter\n`);

  console.log(`Filter 3: url IS NOT NULL OR storage_path IS NOT NULL`);
  const { data: f3, count: c3 } = await supabase
    .from('guideline_chunks')
    .select('id', { count: 'exact', head: false })
    .eq('guideline_source', 'NCCN')
    .or('url.not.is.null,storage_path.not.is.null');
  console.log(`  ✅ ${c3} chunks pass this filter\n`);

  console.log(`Combined filters: title NOT NULL AND source NOT NULL AND (url OR storage_path)`);
  const { data: combined, count: cCombined } = await supabase
    .from('guideline_chunks')
    .select('id', { count: 'exact', head: false })
    .eq('guideline_source', 'NCCN')
    .not('guideline_title', 'is', null)
    .not('guideline_source', 'is', null)
    .or('url.not.is.null,storage_path.not.is.null');
  console.log(`  ✅ ${cCombined} chunks pass all filters\n`);

  // Sample chunks to see their data
  console.log(`Sampling 10 chunks with all filters:`);
  const { data: samples } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, guideline_source, url, storage_path, version_date')
    .eq('guideline_source', 'NCCN')
    .not('guideline_title', 'is', null)
    .not('guideline_source', 'is', null)
    .or('url.not.is.null,storage_path.not.is.null')
    .limit(10);

  samples?.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.guideline_title?.substring(0, 60)}...`);
    console.log(`     Source: ${s.guideline_source}`);
    console.log(`     URL: ${s.url || 'null'}`);
    console.log(`     Storage Path: ${s.storage_path || 'null'}`);
    console.log(`     Version: ${s.version_date || 'null'}`);
  });

  // Check if embeddings exist
  console.log(`\nChecking embeddings:`);
  const { data: withEmbeddings, count: eCount } = await supabase
    .from('guideline_chunks')
    .select('id', { count: 'exact', head: false })
    .eq('guideline_source', 'NCCN')
    .not('guideline_title', 'is', null)
    .not('guideline_source', 'is', null)
    .or('url.not.is.null,storage_path.not.is.null')
    .not('chunk_embedding_vec', 'is', null);
  console.log(`  ✅ ${eCount} chunks have embeddings\n`);

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

debugFilters().catch(console.error);
