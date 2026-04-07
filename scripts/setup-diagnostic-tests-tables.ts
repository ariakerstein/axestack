/**
 * Setup diagnostic tests tables via Supabase client
 * Creates missing tables and adds new taxonomy codes
 *
 * Run: SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/setup-diagnostic-tests-tables.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function addNewTaxonomyCodes() {
  console.log('📋 Adding new taxonomy codes...\n');

  const newCodes = [
    {
      navis_canonical_code: 'multi_solid',
      navis_display_name: 'Multiple Solid Tumors (Pan-Cancer)',
      nccn_category_display: 'Other / Not sure',
      has_nccn_guidelines: false,
      sort_order: 999,
      stage_system: null,
      stage_notes: 'Applies to tests validated across multiple solid tumor types',
    },
    {
      navis_canonical_code: 'advanced_solid',
      navis_display_name: 'Advanced/Metastatic Solid Tumors',
      nccn_category_display: 'Other / Not sure',
      has_nccn_guidelines: false,
      sort_order: 998,
      stage_system: 'Stage IV',
      stage_notes: 'For tests specific to advanced/metastatic disease',
    },
    {
      navis_canonical_code: 'head_neck_hpv_positive',
      navis_display_name: 'HPV+ Head and Neck Cancer',
      nccn_category_display: 'Head & neck',
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

async function checkAndReportSchema() {
  console.log('\n📊 Current schema status:\n');

  // Check diagnostic_tests columns
  const { data: testSample } = await supabase
    .from('diagnostic_tests')
    .select('*')
    .limit(1);

  if (testSample && testSample[0]) {
    console.log('diagnostic_tests columns:', Object.keys(testSample[0]).join(', '));
  }

  // Check if we need to add columns
  const requiredColumns = [
    'openonco_id', 'category', 'name', 'vendor', 'sensitivity', 'specificity',
    'fda_status', 'cancer_types', 'method', 'approach'
  ];

  if (testSample && testSample[0]) {
    const existingColumns = Object.keys(testSample[0]);
    const missingColumns = requiredColumns.filter(c => !existingColumns.includes(c));
    if (missingColumns.length > 0) {
      console.log('\n⚠️  Missing columns:', missingColumns.join(', '));
    } else {
      console.log('\n✅ All required columns present');
    }
  }
}

async function main() {
  console.log('🔧 Setting up diagnostic tests infrastructure\n');
  console.log('='.repeat(60) + '\n');

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  await addNewTaxonomyCodes();
  await checkAndReportSchema();

  console.log('\n✅ Setup complete!\n');
  console.log('Next: Run the import script to load OpenOnco tests');
}

main().catch(console.error);
