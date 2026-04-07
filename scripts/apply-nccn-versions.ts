import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import versionMap from '../NCCN_VERSION_MAP.json';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyNCCNVersions() {
  console.log(`\n📝 APPLYING NCCN VERSION UPDATES TO DATABASE\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  let updated = 0;
  let failed = 0;

  for (const [title, version] of Object.entries(versionMap)) {
    console.log(`Updating: ${title}`);
    console.log(`  Version: ${version}`);

    const { error, count } = await supabase
      .from('guideline_chunks')
      .update({ version_date: version })
      .eq('guideline_title', title)
      .eq('guideline_source', 'NCCN')
      .eq('content_tier', 'tier_1');

    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✅ Updated ${count || '?'} chunks`);
      updated++;
    }
    console.log();
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n✅ COMPLETE\n`);
  console.log(`  Successfully updated: ${updated} guidelines`);
  console.log(`  Failed: ${failed} guidelines`);
  console.log();
}

applyNCCNVersions().catch(console.error);
