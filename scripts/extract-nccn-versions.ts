import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role for bulk updates
);

// Extract version and date from text
function extractVersionInfo(text: string): { version: string | null, date: string | null } {
  const versionPattern = /version\s+(\d+\.\d{4})/i;
  const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i;

  const versionMatch = text.match(versionPattern);
  const dateMatch = text.match(datePattern);

  return {
    version: versionMatch ? versionMatch[1] : null,
    date: dateMatch ? dateMatch[0] : null
  };
}

async function extractNCCNVersions() {
  console.log(`\n📋 EXTRACTING NCCN VERSION NUMBERS\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Get all unique NCCN guideline titles
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

  let updated = 0;
  let notFound = 0;
  const versionMap: Record<string, { version: string, date: string }> = {};

  // For each guideline, check early chunks for version info
  for (const title of uniqueTitles) {
    console.log(`Processing: ${title}`);

    // Get first 3 chunks
    const { data: earlyChunks, error: chunkError } = await supabase
      .from('guideline_chunks')
      .select('id, chunk_index, chunk_text, version_date, publication_date')
      .eq('guideline_title', title)
      .eq('guideline_source', 'NCCN')
      .lte('chunk_index', 2)
      .order('chunk_index', { ascending: true });

    if (chunkError) {
      console.error(`  ❌ Error fetching chunks:`, chunkError);
      continue;
    }

    if (!earlyChunks || earlyChunks.length === 0) {
      console.log(`  ⚠️  No early chunks found`);
      notFound++;
      continue;
    }

    // Try to find version info in early chunks
    let versionInfo = { version: null, date: null };
    for (const chunk of earlyChunks) {
      const extracted = extractVersionInfo(chunk.chunk_text || '');
      if (extracted.version || extracted.date) {
        versionInfo = extracted;
        break;
      }
    }

    if (!versionInfo.version && !versionInfo.date) {
      console.log(`  ⚠️  No version/date found in first 3 chunks`);
      notFound++;
      continue;
    }

    console.log(`  ✅ Found: Version ${versionInfo.version || 'N/A'}, Date: ${versionInfo.date || 'N/A'}`);

    // Store for later
    if (versionInfo.version || versionInfo.date) {
      versionMap[title] = {
        version: versionInfo.version || '',
        date: versionInfo.date || ''
      };
    }

    // Update ALL chunks for this guideline
    const updateData: any = {};
    if (versionInfo.date) {
      updateData.version_date = versionInfo.date;
      updateData.publication_date = versionInfo.date;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('guideline_chunks')
        .update(updateData)
        .eq('guideline_title', title)
        .eq('guideline_source', 'NCCN');

      if (updateError) {
        console.log(`  ❌ Update failed:`, updateError.message);
      } else {
        console.log(`  ✅ Updated all chunks with version/date`);
        updated++;
      }
    }

    console.log();
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📊 SUMMARY:\n`);
  console.log(`  Total guidelines: ${uniqueTitles.length}`);
  console.log(`  Successfully updated: ${updated}`);
  console.log(`  No version found: ${notFound}`);
  console.log();

  if (Object.keys(versionMap).length > 0) {
    console.log(`\n📋 VERSION MAP (for reference):\n`);
    Object.entries(versionMap).slice(0, 10).forEach(([title, info]) => {
      console.log(`  ${title}:`);
      if (info.version) console.log(`    Version: ${info.version}`);
      if (info.date) console.log(`    Date: ${info.date}`);
    });
    console.log(`  ... and ${Object.keys(versionMap).length - 10} more`);
  }
}

extractNCCNVersions().catch(console.error);
