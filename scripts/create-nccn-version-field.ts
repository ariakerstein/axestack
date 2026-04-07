import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Extract version and date from text and create proper citation format
function extractFullVersionInfo(text: string): string | null {
  const versionPattern = /version\s+(\d+\.\d{4})/i;
  const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i;

  const versionMatch = text.match(versionPattern);
  const dateMatch = text.match(datePattern);

  if (versionMatch && dateMatch) {
    return `Version ${versionMatch[1]}, ${dateMatch[0]}`;
  } else if (versionMatch) {
    return `Version ${versionMatch[1]}`;
  } else if (dateMatch) {
    return dateMatch[0];
  }

  return null;
}

async function createNCCNVersionField() {
  console.log(`\n📋 CREATING NCCN VERSION CITATION FIELD\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Get all unique NCCN tier_1 titles
  const { data: titles, error: titleError } = await supabase
    .from('guideline_chunks')
    .select('guideline_title')
    .eq('guideline_source', 'NCCN')
    .eq('content_tier', 'tier_1');

  if (titleError) {
    console.error('❌ Error fetching titles:', titleError);
    return;
  }

  const uniqueTitles = Array.from(new Set(titles?.map(t => t.guideline_title) || []));
  console.log(`Found ${uniqueTitles.length} unique NCCN guidelines\n`);

  const versionInfo: Record<string, string> = {};
  let processed = 0;

  // For each guideline, extract full version info from early chunks
  for (const title of uniqueTitles) {
    console.log(`Processing: ${title}`);

    // Get first 5 chunks to find version info
    const { data: earlyChunks, error: chunkError } = await supabase
      .from('guideline_chunks')
      .select('chunk_text')
      .eq('guideline_title', title)
      .eq('guideline_source', 'NCCN')
      .lte('chunk_index', 4)
      .order('chunk_index', { ascending: true });

    if (chunkError || !earlyChunks || earlyChunks.length === 0) {
      console.log(`  ⚠️  No chunks found`);
      continue;
    }

    // Try to find version info
    let fullVersion: string | null = null;
    for (const chunk of earlyChunks) {
      const extracted = extractFullVersionInfo(chunk.chunk_text || '');
      if (extracted) {
        fullVersion = extracted;
        break;
      }
    }

    if (fullVersion) {
      console.log(`  ✅ Found: ${fullVersion}`);
      versionInfo[title] = fullVersion;
      processed++;
    } else {
      console.log(`  ⚠️  No version info found in first 5 chunks`);
      // Show first chunk preview for debugging
      if (earlyChunks[0]?.chunk_text) {
        const preview = earlyChunks[0].chunk_text.substring(0, 200);
        console.log(`  Preview: ${preview}...`);
      }
    }
    console.log();
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📊 SUMMARY:\n`);
  console.log(`  Total guidelines: ${uniqueTitles.length}`);
  console.log(`  Version info extracted: ${processed}`);
  console.log(`  Missing version info: ${uniqueTitles.length - processed}\n`);

  // Export as JSON for reference
  console.log(`\n📋 NCCN VERSION CITATIONS (JSON format):\n`);
  console.log(JSON.stringify(versionInfo, null, 2));

  // Also create a SQL update script
  console.log(`\n\n📝 SQL UPDATE STATEMENTS:\n`);
  console.log(`-- Update version_date field with full citation format\n`);
  Object.entries(versionInfo).forEach(([title, version]) => {
    const escapedTitle = title.replace(/'/g, "''");
    const escapedVersion = version.replace(/'/g, "''");
    console.log(`UPDATE guideline_chunks SET version_date = '${escapedVersion}' WHERE guideline_title = '${escapedTitle}' AND guideline_source = 'NCCN' AND content_tier = 'tier_1';`);
  });
}

createNCCNVersionField().catch(console.error);
