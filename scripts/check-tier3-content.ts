/**
 * Check tier 3 webinar content available for different cancer types
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xobmvxatidcnbuwqptbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYm12eGF0aWRjbmJ1d3FwdGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1NzUyMDcsImV4cCI6MjA0NjE1MTIwN30.R37Po2MkOrmo16b2lGAG7tKCANPAJfG9OYSzTD_zzpI'
);

async function checkTier3Content() {
  const cancerTypes = ['Pancreatic', 'Lymphoma', 'Breast', 'Lung', 'Prostate'];

  for (const cancer of cancerTypes) {
    console.log(`\n=== ${cancer} ===`);

    const { data, error } = await supabase
      .from('guideline_chunks')
      .select('guideline_title, url, storage_path, content_tier')
      .ilike('cancer_type', `%${cancer}%`)
      .eq('content_tier', 'tier_3')
      .eq('status', 'active')
      .limit(10);

    if (error) {
      console.log(`  Error: ${error.message}`);
      continue;
    }

    // Dedupe by title
    const seen = new Set<string>();
    const unique = (data || []).filter(c => {
      if (seen.has(c.guideline_title)) return false;
      seen.add(c.guideline_title);
      return true;
    });

    console.log(`  Found ${unique.length} unique tier_3 resources:`);
    unique.forEach(c => {
      console.log(`  - ${c.guideline_title?.substring(0, 60)}...`);
      console.log(`    url: ${c.url || 'NULL'}`);
      console.log(`    storage_path: ${c.storage_path || 'NULL'}`);
    });
  }
}

checkTier3Content();
