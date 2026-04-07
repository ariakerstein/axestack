/**
 * Apply OpenOnco migration by creating tables via Supabase client
 * Since we can't execute raw SQL via REST API, we'll create tables manually
 *
 * Run: SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/apply-openonco-migration.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkTablesExist() {
  console.log('🔍 Checking if tables already exist...\n');

  // Check openonco_tests
  const { data: testSample, error: testError } = await supabase
    .from('openonco_tests')
    .select('id')
    .limit(1);

  if (!testError) {
    console.log('✅ openonco_tests table exists');
    return true;
  }

  console.log('❌ openonco_tests table does not exist yet');
  return false;
}

async function addTaxonomyCodes() {
  console.log('\n📋 Adding new taxonomy codes...\n');

  const newCodes = [
    {
      nccn_category_code: 'other',
      nccn_category_display: 'Other / Not sure',
      navis_canonical_code: 'multi_solid',
      navis_display_name: 'Multiple Solid Tumors (Pan-Cancer)',
      has_nccn_guidelines: false,
      sort_order: 999,
      stage_system: null,
      stage_notes: 'Applies to tests validated across multiple solid tumor types',
    },
    {
      nccn_category_code: 'other',
      nccn_category_display: 'Other / Not sure',
      navis_canonical_code: 'advanced_solid',
      navis_display_name: 'Advanced/Metastatic Solid Tumors',
      has_nccn_guidelines: false,
      sort_order: 998,
      stage_system: 'Stage IV',
      stage_notes: 'For tests specific to advanced/metastatic disease',
    },
    {
      nccn_category_code: 'head_neck',
      nccn_category_display: 'Head & neck',
      navis_canonical_code: 'head_neck_hpv_positive',
      navis_display_name: 'HPV+ Head and Neck Cancer',
      has_nccn_guidelines: true,
      sort_order: 15,
      stage_system: 'AJCC 8th',
      stage_notes: 'HPV-positive oropharyngeal squamous cell carcinoma',
    },
  ];

  for (const code of newCodes) {
    const { error } = await supabase
      .from('cancer_taxonomy')
      .upsert(code, { onConflict: 'navis_canonical_code' });

    if (error) {
      console.log(`  ❌ ${code.navis_canonical_code}: ${error.message}`);
    } else {
      console.log(`  ✅ ${code.navis_canonical_code}`);
    }
  }
}

async function main() {
  console.log('🚀 OpenOnco Migration Setup\n');
  console.log('='.repeat(60) + '\n');

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  // Check if tables exist
  const tablesExist = await checkTablesExist();

  if (!tablesExist) {
    console.log('\n⚠️  Tables do not exist yet.');
    console.log('\nTo create the tables:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy and paste the contents of:');
    console.log('   supabase/migrations/20251209000002_create_openonco_tests_tables.sql');
    console.log('3. Run the SQL');
    console.log('\nAlternatively, run: supabase db push');
  } else {
    console.log('\n✅ Tables already exist!');
  }

  // Add taxonomy codes (this works via REST API)
  await addTaxonomyCodes();

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Taxonomy codes added.');

  if (!tablesExist) {
    console.log('\n📝 Next steps:');
    console.log('1. Apply the SQL migration (see instructions above)');
    console.log('2. Run: npx tsx scripts/import-openonco-tests.ts');
  } else {
    console.log('\n📝 Next step:');
    console.log('Run: npx tsx scripts/import-openonco-tests.ts');
  }
}

main().catch(console.error);
