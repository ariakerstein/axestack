import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xobmvxatidcnbuwqptbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYm12eGF0aWRjbmJ1d3FwdGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1NzUyMDcsImV4cCI6MjA0NjE1MTIwN30.R37Po2MkOrmo16b2lGAG7tKCANPAJfG9OYSzTD_zzpI'
);

async function auditUrls() {
  console.log('=== AUDITING URL STRUCTURE IN guideline_chunks ===\n');

  // Get sample of URLs from guideline_chunks
  const { data: chunks, error } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, url, content_tier, storage_path')
    .not('url', 'is', null)
    .limit(50);

  if (error) {
    console.error('Error fetching chunks:', error.message);
    return;
  }

  // Categorize URLs by pattern
  const urlPatterns: Record<string, { count: number; examples: string[] }> = {};
  const brokenPatterns: string[] = [];

  chunks?.forEach(chunk => {
    const url = chunk.url;
    if (!url) return;

    // Identify pattern
    let pattern = 'unknown';
    if (url.startsWith('http://localhost')) {
      pattern = 'localhost (BROKEN)';
      brokenPatterns.push(url);
    } else if (url.startsWith('https://xobmvxatidcnbuwqptbe.supabase.co/storage')) {
      pattern = 'supabase_storage (CORRECT)';
    } else if (url.startsWith('https://www.nccn.org')) {
      pattern = 'nccn_external (CORRECT)';
    } else if (url.startsWith('guidelines/') || url.startsWith('NCCN_')) {
      pattern = 'relative_path (NEEDS FIX)';
      brokenPatterns.push(url);
    } else if (url.startsWith('/')) {
      pattern = 'absolute_path (NEEDS FIX)';
      brokenPatterns.push(url);
    } else {
      pattern = 'other';
    }

    if (!urlPatterns[pattern]) {
      urlPatterns[pattern] = { count: 0, examples: [] };
    }
    urlPatterns[pattern].count++;
    if (urlPatterns[pattern].examples.length < 3) {
      urlPatterns[pattern].examples.push(url);
    }
  });

  console.log('URL PATTERNS FOUND:');
  console.log('===================');
  for (const [pattern, data] of Object.entries(urlPatterns)) {
    console.log(`\n${pattern}: ${data.count} URLs`);
    data.examples.forEach(ex => console.log(`  - ${ex.substring(0, 100)}...`));
  }

  // Check what's in storage
  console.log('\n\n=== CHECKING STORAGE BUCKET STRUCTURE ===\n');

  // List files in storage using RPC or direct API
  const { data: storageList, error: storageError } = await supabase
    .storage
    .from('guideline-pdfs')
    .list('', { limit: 20 });

  if (storageError) {
    console.error('Storage list error:', storageError.message);
  } else {
    console.log('Top-level folders/files in guideline-pdfs bucket:');
    storageList?.forEach(item => {
      console.log(`  ${item.name} (${item.id ? 'folder' : 'file'})`);
    });
  }

  // Check specific folders
  for (const folder of ['guidelines', 'NCCN_general', 'webinars', 'nccn_pdfs']) {
    const { data: folderList, error: folderError } = await supabase
      .storage
      .from('guideline-pdfs')
      .list(folder, { limit: 5 });

    if (!folderError && folderList && folderList.length > 0) {
      console.log(`\n${folder}/ folder contents (first 5):`);
      folderList.forEach(item => console.log(`  - ${item.name}`));
    } else if (folderError) {
      console.log(`\n${folder}/ - Error: ${folderError.message}`);
    } else {
      console.log(`\n${folder}/ - Empty or not found`);
    }
  }

  // Summary of broken URLs
  console.log('\n\n=== BROKEN URL SUMMARY ===');
  console.log(`Total broken/relative URLs found: ${brokenPatterns.length}`);
  console.log('\nSample broken URLs:');
  brokenPatterns.slice(0, 10).forEach(url => console.log(`  - ${url}`));

  // Check distinct URL patterns in entire table
  console.log('\n\n=== FULL TABLE URL AUDIT ===\n');
  const { data: allUrls, error: allError } = await supabase
    .from('guideline_chunks')
    .select('url')
    .not('url', 'is', null);

  if (!allError && allUrls) {
    const patterns = {
      localhost: 0,
      supabase_storage: 0,
      nccn_external: 0,
      relative_path: 0,
      null_empty: 0,
      other: 0
    };

    allUrls.forEach(row => {
      const url = row.url || '';
      if (!url) patterns.null_empty++;
      else if (url.startsWith('http://localhost')) patterns.localhost++;
      else if (url.includes('supabase.co/storage')) patterns.supabase_storage++;
      else if (url.startsWith('https://www.nccn.org')) patterns.nccn_external++;
      else if (!url.startsWith('http')) patterns.relative_path++;
      else patterns.other++;
    });

    console.log('URL Distribution across ALL guideline_chunks:');
    for (const [pattern, count] of Object.entries(patterns)) {
      const pct = ((count / allUrls.length) * 100).toFixed(1);
      console.log(`  ${pattern}: ${count} (${pct}%)`);
    }
  }
}

auditUrls();
