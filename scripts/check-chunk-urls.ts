/**
 * Check what URL values are stored in guideline_chunks
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xobmvxatidcnbuwqptbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYm12eGF0aWRjbmJ1d3FwdGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1NzUyMDcsImV4cCI6MjA0NjE1MTIwN30.R37Po2MkOrmo16b2lGAG7tKCANPAJfG9OYSzTD_zzpI'
);

async function checkUrls() {
  console.log('Checking URL values in guideline_chunks for Lymphoma...\n');

  const { data, error } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, url, storage_path, content_tier')
    .ilike('cancer_type', '%Lymphoma%')
    .eq('status', 'active')
    .limit(15);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${data?.length || 0} chunks:\n`);

  // Group by tier
  const tier1 = data?.filter(c => c.content_tier === 'tier_1') || [];
  const tier3 = data?.filter(c => c.content_tier === 'tier_3') || [];

  console.log('=== TIER 1 (NCCN) ===');
  tier1.slice(0, 5).forEach((c, i) => {
    console.log(`[${i+1}] ${c.guideline_title?.substring(0, 50)}...`);
    console.log(`    url: ${c.url || 'NULL'}`);
    console.log(`    storage_path: ${c.storage_path || 'NULL'}`);
  });

  console.log('\n=== TIER 3 (Webinars) ===');
  tier3.slice(0, 5).forEach((c, i) => {
    console.log(`[${i+1}] ${c.guideline_title?.substring(0, 50)}...`);
    console.log(`    url: ${c.url || 'NULL'}`);
    console.log(`    storage_path: ${c.storage_path || 'NULL'}`);
  });

  // URL pattern analysis
  console.log('\n=== URL PATTERN ANALYSIS ===');
  const urlPatterns = {
    null: 0,
    localhost: 0,
    nccn: 0,
    supabase: 0,
    relative: 0,
    other: 0
  };

  data?.forEach(c => {
    if (!c.url) urlPatterns.null++;
    else if (c.url.startsWith('http://localhost')) urlPatterns.localhost++;
    else if (c.url.includes('nccn.org')) urlPatterns.nccn++;
    else if (c.url.includes('supabase')) urlPatterns.supabase++;
    else if (!c.url.startsWith('http')) urlPatterns.relative++;
    else urlPatterns.other++;
  });

  console.log('URL patterns in sample:');
  Object.entries(urlPatterns).forEach(([k, v]) => {
    if (v > 0) console.log(`  ${k}: ${v}`);
  });
}

checkUrls();
