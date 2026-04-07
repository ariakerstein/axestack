import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

async function showSampleChunks() {
  console.log(`\n📄 SAMPLE CHUNKS FROM DATABASE\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Get 5 random chunks from pancreatic cancer
  const { data: pancreaticChunks, error: pancError } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, guideline_source, chunk_index, chunk_text, content_tier')
    .eq('guideline_source', 'NCCN')
    .eq('content_tier', 'tier_1')
    .ilike('guideline_title', '%pancreatic%')
    .limit(3);

  if (pancError) {
    console.error('Error fetching pancreatic chunks:', pancError);
  } else if (pancreaticChunks && pancreaticChunks.length > 0) {
    console.log(`🥞 PANCREATIC CANCER CHUNKS (${pancreaticChunks.length} samples):\n`);
    pancreaticChunks.forEach((chunk, i) => {
      console.log(`${i + 1}. Source: ${chunk.guideline_source} - ${chunk.guideline_title}`);
      console.log(`   Chunk Index: ${chunk.chunk_index}`);
      console.log(`   Tier: ${chunk.content_tier}`);
      console.log(`   Text Preview (first 300 chars):`);
      console.log(`   ${chunk.chunk_text?.substring(0, 300)}...`);
      console.log();
    });
  }

  // Get 5 random chunks from different sources
  const { data: randomChunks, error: randomError } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, guideline_source, chunk_index, chunk_text, content_tier, cancer_type')
    .eq('guideline_source', 'NCCN')
    .eq('content_tier', 'tier_1')
    .range(0, 100);

  if (randomError) {
    console.error('Error fetching random chunks:', randomError);
  } else if (randomChunks && randomChunks.length > 0) {
    // Pick 5 random ones
    const samples = [];
    const usedIndices = new Set();
    while (samples.length < 5 && samples.length < randomChunks.length) {
      const idx = Math.floor(Math.random() * randomChunks.length);
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        samples.push(randomChunks[idx]);
      }
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`🎲 RANDOM NCCN CHUNKS (${samples.length} samples):\n`);
    samples.forEach((chunk, i) => {
      console.log(`${i + 1}. Source: ${chunk.guideline_source} - ${chunk.guideline_title}`);
      console.log(`   Cancer Type: ${chunk.cancer_type || 'general'}`);
      console.log(`   Chunk Index: ${chunk.chunk_index}`);
      console.log(`   Tier: ${chunk.content_tier}`);
      console.log(`   Text Preview (first 300 chars):`);
      console.log(`   ${chunk.chunk_text?.substring(0, 300)}...`);
      console.log();
    });
  }

  // Check for version information in early chunks
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`📋 CHECKING FOR VERSION NUMBERS (chunk_index 0-2):\n`);

  const { data: earlyChunks, error: earlyError } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, chunk_index, chunk_text')
    .eq('guideline_source', 'NCCN')
    .eq('content_tier', 'tier_1')
    .lte('chunk_index', 2)
    .limit(20);

  if (earlyError) {
    console.error('Error fetching early chunks:', earlyError);
  } else if (earlyChunks) {
    const versionPattern = /version\s+\d+\.\d{4}/i;
    const datePattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i;

    const chunksWithVersions = earlyChunks.filter(c =>
      versionPattern.test(c.chunk_text || '') || datePattern.test(c.chunk_text || '')
    );

    if (chunksWithVersions.length > 0) {
      console.log(`✅ Found ${chunksWithVersions.length} chunks with version/date information:\n`);
      chunksWithVersions.slice(0, 5).forEach((chunk, i) => {
        const text = chunk.chunk_text || '';
        const versionMatch = text.match(versionPattern);
        const dateMatch = text.match(datePattern);

        console.log(`${i + 1}. ${chunk.guideline_title} (chunk ${chunk.chunk_index})`);
        if (versionMatch) {
          console.log(`   Version: ${versionMatch[0]}`);
        }
        if (dateMatch) {
          console.log(`   Date: ${dateMatch[0]}`);
        }
        console.log(`   Full text preview:`);
        console.log(`   ${text.substring(0, 400)}...`);
        console.log();
      });
    } else {
      console.log(`⚠️  No version information found in early chunks`);
      console.log(`   Showing sample early chunks to debug:\n`);
      earlyChunks.slice(0, 3).forEach((chunk, i) => {
        console.log(`${i + 1}. ${chunk.guideline_title} (chunk ${chunk.chunk_index})`);
        console.log(`   ${chunk.chunk_text?.substring(0, 300)}...`);
        console.log();
      });
    }
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

showSampleChunks().catch(console.error);
