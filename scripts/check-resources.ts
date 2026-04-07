import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://xobmvxatidcnbuwqptbe.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYm12eGF0aWRjbmJ1d3FwdGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1NzUyMDcsImV4cCI6MjA0NjE1MTIwN30.R37Po2MkOrmo16b2lGAG7tKCANPAJfG9OYSzTD_zzpI'
);

async function checkContent() {
  // Check content_library for prostate
  console.log('=== Checking content_library for prostate ===');
  const { data: prostate, error: e1 } = await supabase
    .from('content_library')
    .select('title, source_type, cancer_type, source_url')
    .or('cancer_type.ilike.%prostate%,title.ilike.%prostate%')
    .limit(20);

  if (e1) console.error('Error:', e1.message);
  else console.log('Found:', prostate?.length, 'items');
  prostate?.forEach(p => console.log(`  [${p.source_type}] ${p.title} (${p.cancer_type})`));

  // Check guidelines_with_urls view
  console.log('\n=== Checking guidelines_with_urls ===');
  const { data: guidelines, error: e2 } = await supabase
    .from('guidelines_with_urls')
    .select('*')
    .limit(5);

  if (e2) console.error('Error:', e2.message);
  else {
    console.log('Sample:', guidelines?.length);
    guidelines?.forEach(g => console.log(`  ${g.title} - ${g.content_type}`));
  }

  // Check what tiers exist
  console.log('\n=== Checking document_chunks tiers for prostate ===');
  const { data: chunks, error: e3 } = await supabase
    .from('document_chunks')
    .select('title, tier, cancer_type')
    .or('cancer_type.ilike.%prostate%,title.ilike.%prostate%')
    .limit(20);

  if (e3) console.error('Error:', e3.message);
  else {
    console.log('Found:', chunks?.length, 'chunks');
    const tiers = new Map<string, number>();
    chunks?.forEach(c => {
      const title = c.title || 'Unknown';
      const key = `${c.tier}: ${title.substring(0, 50)}`;
      tiers.set(key, (tiers.get(key) || 0) + 1);
    });
    tiers.forEach((count, key) => console.log(`  ${key} (${count})`));
  }

  // Check unique titles with tiers for prostate
  console.log('\n=== Unique prostate resources by tier ===');
  const { data: uniqueRes, error: e4 } = await supabase
    .from('document_chunks')
    .select('title, tier, source_url')
    .or('cancer_type.ilike.%prostate%,title.ilike.%prostate%');

  if (e4) console.error('Error:', e4.message);
  else {
    const unique = new Map<string, { tier: string; url: string }>();
    uniqueRes?.forEach(r => {
      if (r.title && !unique.has(r.title)) {
        unique.set(r.title, { tier: r.tier, url: r.source_url });
      }
    });
    console.log('Unique resources:', unique.size);
    unique.forEach((v, k) => console.log(`  [${v.tier}] ${k}`));
  }
}

checkContent();
