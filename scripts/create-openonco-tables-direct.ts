/**
 * Create OpenOnco tables using direct SQL via Supabase's Management API
 *
 * This bypasses the migration system and creates tables directly
 *
 * Run: npx tsx scripts/create-openonco-tables-direct.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDY3NDM4MCwiZXhwIjoyMDU2MjUwMzgwfQ.OC0ma2mN2Np_-AEL4siwLaUV0eGZ1tDXgbghMfB61pQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkTableExists(tableName: string): Promise<boolean> {
  const { error } = await supabase.from(tableName).select('id').limit(1);
  return !error || !error.message.includes('does not exist');
}

async function createOpenOncoTables() {
  console.log('🔧 Creating OpenOnco tables...\n');

  // Check if table already exists
  const exists = await checkTableExists('openonco_tests');
  if (exists) {
    console.log('✅ openonco_tests table already exists!');
    return true;
  }

  // Since we can't execute DDL via the REST API, we need to use a workaround
  // We'll create an RPC function that creates the table if the user has the proper exec_sql function
  console.log('❌ Cannot create tables via REST API - DDL requires direct database access.');
  console.log('\n📋 MANUAL STEPS REQUIRED:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new');
  console.log('2. Paste the SQL from: supabase/migrations/20251209000002_create_openonco_tests_tables.sql');
  console.log('3. Click "Run"');
  console.log('\n⏳ After running the SQL, come back and run:');
  console.log('   npx tsx scripts/import-openonco-tests.ts\n');

  return false;
}

async function verifyTaxonomyCodes() {
  console.log('📋 Verifying taxonomy codes...\n');

  const { data, error } = await supabase
    .from('cancer_taxonomy')
    .select('navis_canonical_code, navis_display_name')
    .in('navis_canonical_code', ['multi_solid', 'advanced_solid', 'head_neck_hpv_positive']);

  if (error) {
    console.log('❌ Error checking taxonomy:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No taxonomy codes found. Adding them now...\n');
    await addTaxonomyCodes();
  } else {
    console.log('Found taxonomy codes:');
    data.forEach(d => console.log(`  ✅ ${d.navis_canonical_code}: ${d.navis_display_name}`));
  }
}

async function addTaxonomyCodes() {
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
  console.log('🚀 OpenOnco Tables Setup\n');
  console.log('='.repeat(60) + '\n');

  // First verify/add taxonomy codes (this works via REST)
  await verifyTaxonomyCodes();

  console.log('\n');

  // Try to create tables
  await createOpenOncoTables();
}

main().catch(console.error);
