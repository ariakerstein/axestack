require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const patientId = process.argv[2];

if (!patientId) {
  console.log('Usage: node scripts/test-summary-generation.cjs <patient-id>');
  console.log('Example: node scripts/test-summary-generation.cjs 76f9fcd4-732f-47b2-8596-4bd42cf18db7');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSummary() {
  console.log(`\n🔍 Testing summary generation for patient: ${patientId}\n`);

  // Check if it's a provisional patient
  console.log('1. Checking if provisional patient...');
  const { data: provData, error: provError } = await supabase
    .from('provisional_patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (provData) {
    console.log('✅ Found provisional patient:', provData.first_name, provData.last_name);
    console.log('   Email:', provData.email);
    console.log('   Cancer type:', provData.cancer_type);
  } else {
    console.log('❌ Not a provisional patient');
    if (provError) console.log('   Error:', provError.message);
  }

  // Check medical records
  console.log('\n2. Checking medical records...');
  const { data: records, error: recordsError } = await supabase
    .from('medical_records')
    .select('id, original_name, created_at, file_type, status, ai_summary, record_type')
    .eq('user_id', patientId)
    .neq('record_type', 'patient_summary');

  if (recordsError) {
    console.log('❌ Error fetching records:', recordsError.message);
  } else if (!records || records.length === 0) {
    console.log('❌ No medical records found!');
    console.log('   This is why summary generation is failing.');
    console.log('   Upload some medical records first.');
  } else {
    console.log(`✅ Found ${records.length} medical records:`);
    records.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.original_name} (${r.file_type}, ${r.status})`);
      console.log(`      Has AI Summary: ${r.ai_summary ? 'Yes' : 'No'}`);
    });
  }

  // Check conversations
  console.log('\n3. Checking conversations...');
  const { data: convs, error: convError } = await supabase
    .from('document_conversations')
    .select('id, created_at')
    .eq('user_id', patientId);

  if (convError) {
    console.log('❌ Error fetching conversations:', convError.message);
  } else if (!convs || convs.length === 0) {
    console.log('ℹ️  No conversations found (optional)');
  } else {
    console.log(`✅ Found ${convs.length} conversation(s)`);
  }

  console.log('\n4. Summary Generation Check:');
  if (!records || records.length === 0) {
    console.log('❌ CANNOT generate summary - no medical records');
    console.log('   Action needed: Upload medical records to this patient case');
  } else {
    console.log('✅ Ready to generate summary');
    console.log(`   Will include ${records.length} medical records`);
    console.log(`   ${records.filter(r => r.ai_summary).length} have AI analysis`);
  }
}

testSummary();
